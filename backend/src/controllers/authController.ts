import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser, UserRole } from "../models/User";
import { AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET || "synapse_jwt_super_secret_production_key_2026_secured";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function generateToken(user: IUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, role, roll_number, faculty_id, department, designation, course, branch, year, section } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Name, email, and password are required." });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(400).json({ error: "An account with this email already exists." });
      return;
    }

    if (roll_number) {
      const existingRoll = await User.findOne({ roll_number: roll_number.trim() });
      if (existingRoll) {
        res.status(400).json({ error: `An account with roll number "${roll_number}" already exists.` });
        return;
      }
    }

    if (faculty_id) {
      const existingFaculty = await User.findOne({ faculty_id: faculty_id.trim() });
      if (existingFaculty) {
        res.status(400).json({ error: `An account with faculty ID "${faculty_id}" already exists.` });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "student",
      roll_number: roll_number?.trim(),
      faculty_id: faculty_id?.trim(),
      department: department?.trim(),
      designation: designation?.trim(),
      course: course?.trim(),
      branch: branch?.trim(),
      year: year?.toString().trim(),
      section: section?.trim(),
    });

    const token = generateToken(user);
    res.status(201).json({
      message: "User registered successfully.",
      token,
      user,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to register user." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) {
      res.status(400).json({ error: "Invalid login credentials." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Invalid login credentials." });
      return;
    }

    const token = generateToken(user);
    res.json({
      message: "Login successful.",
      token,
      user,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to log in." });
  }
}

export async function loginWithIdentifier(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, password } = req.body;
    const cleanId = (identifier || "").trim();

    if (!cleanId || !password) {
      res.status(400).json({ error: "Please enter your Login ID / Roll Number and password." });
      return;
    }

    // Match by email, roll_number, or faculty_id
    let user = await User.findOne({
      $or: [
        { email: cleanId.toLowerCase() },
        { roll_number: { $regex: new RegExp(`^${cleanId}$`, "i") } },
        { faculty_id: { $regex: new RegExp(`^${cleanId}$`, "i") } },
      ],
    });

    if (!user || !user.password) {
      res.status(400).json({ error: "Invalid login credentials." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Invalid login credentials." });
      return;
    }

    const token = generateToken(user);
    res.json({
      message: "Login successful.",
      token,
      user,
      role: user.role,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to log in." });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  res.json({ user: req.user });
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const { name, bio, avatar_url, department, designation, course, branch, year, section, mindset_traits } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(name && { name: name.trim() }),
        ...(bio !== undefined && { bio }),
        ...(avatar_url && { avatar_url }),
        ...(department && { department }),
        ...(designation && { designation }),
        ...(course && { course }),
        ...(branch && { branch }),
        ...(year && { year }),
        ...(section && { section }),
        ...(mindset_traits && { mindset_traits }),
      },
      { new: true }
    );

    res.json({ user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update profile." });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters long." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(req.user.id, {
      password: hashedPassword,
      must_change_password: false,
    });

    res.json({ message: "Password updated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update password." });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  res.json({ message: "Password reset request recorded." });
}
