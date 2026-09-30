import { Router, type Request, type Response } from "express";
import { registerSchema, zodErrorFormatter , loginSchema  } from "@repo/common/common";
import { prisma } from "@repo/prisma/client";
import bcrypt, { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/middleware.route.ts";
export const authRoute = Router()


authRoute.post("/register" , async (req:Request , res:Response)=>{

    const { success , data , error }    =  registerSchema.safeParse(req.body);

    if(!success){
        return res.status(400).json({ message: "Invalid input", errors: zodErrorFormatter({ error }) });
    }

    const { email , password } = data;
    

    const existingUser = await prisma.user.findUnique({
        where:{email}
    })
    if(existingUser){
        return res.status(400).json({ message: "User already exists" });
    }

  await prisma.user.create({
        data:{
            email,
            password: await hash(password, 10),
            username: email.split("@")[0]
        }
    });
    return res.status(201).json({ message: "User created successfully"});

})
authRoute.post("/login", async (req: Request, res: Response) => {
    try {
        const { success, data, error } = loginSchema.safeParse(req.body);

        if (!success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: zodErrorFormatter({ error }),
            });
        }

        const { email, password } = data;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password",
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET!,
            { expiresIn: "30d" }
        );
        console.log(`this is user ${user}`)
        console.log("token "+token)
        return res.status(200).json({
            message: "Login successful",
                data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                },
                }
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
});



authRoute.post("/me" , auth, async (req:Request , res:Response)=>{

    const userId  = req.userId;

    const user = await prisma.user.findUnique({
        where:{id:userId},
        omit:{password:true}
        // includes:{
        //     rating:true,
        //     gameMember:{
        //         includes:{
        //             game:true
        //         } 
        //     }
        // }
    });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
   
    return res.status(200).json({ message: "User fetched successfully", data:{user}});

})