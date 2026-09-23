import zod from "zod";

export const registerSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(8, "Password must be at least 8 characters long").max(32, "Password must be at most 32 characters long"),
});
export const loginSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(8, "Password must be at least 8 characters long").max(32, "Password must be at most 32 characters long"),
});

export const zodErrorFormatter = ({error}:{error: zod.ZodError}) => {
    
    return error.issues.map((err) => `path: ${err.path.join(".")} , message: ${err.message}`).join(", ");
};