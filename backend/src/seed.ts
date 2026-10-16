import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/database";
import { User } from "./models/User";
import { Classroom } from "./models/Classroom";
import { TeachingAssignment } from "./models/TeachingAssignment";
import { ClassroomMember } from "./models/ClassroomMember";

async function seed() {
  await connectDB();
  console.log("[Seed] Seeding initial institutional data...");

  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash("Synapse@2026", salt);
  const facultyPassword = await bcrypt.hash("Sudhakar", salt);

  // 1. Administrator
  let admin = await User.findOne({ email: "chandureddy180706@gmail.com" });
  if (!admin) {
    admin = await User.create({
      name: "Institutional Administrator",
      email: "chandureddy180706@gmail.com",
      password: defaultPassword,
      role: "administrator",
      faculty_id: "ADMIN001",
      department: "Administration",
      designation: "Dean / Institutional Admin",
      is_admin: true,
      must_change_password: false,
    });
    console.log("[Seed] Created Administrator: chandureddy180706@gmail.com (ADMIN001 / Synapse@2026)");
  }

  // 2. Faculty
  let faculty = await User.findOne({ email: "sudhakar@synapse.edu" });
  if (!faculty) {
    faculty = await User.create({
      name: "Dr. Sudhakar Rao",
      email: "sudhakar@synapse.edu",
      password: facultyPassword,
      role: "faculty",
      faculty_id: "FAC001",
      department: "Computer Science and Engineering",
      designation: "Associate Professor",
      must_change_password: false,
    });
    console.log("[Seed] Created Faculty: sudhakar@synapse.edu (FAC001 / Sudhakar)");
  }

  // 3. Classroom
  let classroom = await Classroom.findOne({ name: "B.Tech CSE - 3A" });
  if (!classroom) {
    classroom = await Classroom.create({
      name: "B.Tech CSE - 3A",
      course: "B.Tech",
      branch: "Computer Science and Engineering",
      year: 3,
      section: "A",
      academic_year: "2026-27",
      class_code: "CSE3A26",
      created_by: admin._id,
    });
    console.log("[Seed] Created Classroom: B.Tech CSE - 3A");
  }

  // 4. Teaching Assignment
  let ta = await TeachingAssignment.findOne({ classroom_id: classroom._id, faculty_id: faculty._id });
  if (!ta) {
    ta = await TeachingAssignment.create({
      classroom_id: classroom._id,
      faculty_id: faculty._id,
      subject_name: "Database Management Systems",
      subject_code: "CS301",
    });
    console.log("[Seed] Created Teaching Assignment: DBMS assigned to Dr. Sudhakar Rao");
  }

  // 5. Student
  let student = await User.findOne({ email: "alex.chen@student.synapse.local" });
  if (!student) {
    student = await User.create({
      name: "Alex Chen",
      email: "alex.chen@student.synapse.local",
      password: defaultPassword,
      role: "student",
      roll_number: "CS22B042",
      course: "B.Tech",
      branch: "Computer Science and Engineering",
      year: "3",
      section: "A",
      must_change_password: false,
    });
    console.log("[Seed] Created Student: alex.chen@student.synapse.local (CS22B042 / Synapse@2026)");

    await ClassroomMember.create({
      classroom_id: classroom._id,
      student_id: student._id,
    });
    console.log("[Seed] Enrolled Alex Chen into B.Tech CSE - 3A");
  }

  // 6. Requested Faculty: ID 101, Pass 123456
  const simplePass = await bcrypt.hash("123456", salt);
  let faculty101 = await User.findOne({ faculty_id: "101" });
  if (!faculty101) {
    faculty101 = await User.create({
      name: "Faculty 101",
      email: "faculty101@synapse.edu",
      password: simplePass,
      role: "faculty",
      faculty_id: "101",
      department: "Computer Science and Engineering",
      designation: "Assistant Professor",
      must_change_password: false,
    });
    console.log("[Seed] Created Faculty: ID 101 / 123456 (faculty101@synapse.edu)");
  } else {
    faculty101.password = simplePass;
    faculty101.must_change_password = false;
    await faculty101.save();
    console.log("[Seed] Updated Faculty: ID 101 password set to 123456");
  }

  // Assign Faculty 101 to a course in the classroom
  let ta101 = await TeachingAssignment.findOne({ classroom_id: classroom._id, faculty_id: faculty101._id });
  if (!ta101) {
    ta101 = await TeachingAssignment.create({
      classroom_id: classroom._id,
      faculty_id: faculty101._id,
      subject_name: "Computer Networks",
      subject_code: "CS302",
    });
    console.log("[Seed] Assigned Faculty 101 to Computer Networks (CS302)");
  }

  // 7. Requested Student: Roll 501, Pass 123456
  let student501 = await User.findOne({ roll_number: "501" });
  if (!student501) {
    student501 = await User.create({
      name: "Student 501",
      email: "student501@student.synapse.local",
      password: simplePass,
      role: "student",
      roll_number: "501",
      course: "B.Tech",
      branch: "Computer Science and Engineering",
      year: "3",
      section: "A",
      must_change_password: false,
    });
    console.log("[Seed] Created Student: Roll 501 / 123456 (student501@student.synapse.local)");

    await ClassroomMember.create({
      classroom_id: classroom._id,
      student_id: student501._id,
    });
    console.log("[Seed] Enrolled Student 501 into B.Tech CSE - 3A");
  } else {
    student501.password = simplePass;
    student501.must_change_password = false;
    await student501.save();
    console.log("[Seed] Updated Student: Roll 501 password set to 123456");
  }

  console.log("[Seed] Seed completed successfully.");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
