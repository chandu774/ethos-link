import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";

const lovableAuth = createLovableAuth({});

export const lovable = {
  auth: {
    signOut: async () => {
      return await lovableAuth.signOut();
    },
  },
};
