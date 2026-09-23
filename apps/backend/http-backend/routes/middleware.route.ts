import jwt, { type JwtPayload } from "jsonwebtoken";



export const auth = (req: any, res: any, next: any) => {
    const bearerToken = req.headers.authorization;
    if (!bearerToken) {
        return res.status(401).json({ message: "Authorization header is missing" });
    }

    const extractedToken = bearerToken.split("Bearer ")[1];

    if (!extractedToken) {
        return res.status(401).json({ message: "Token is missing" });
    }

    try {
        const decoded = jwt.verify(extractedToken, process.env.JWT_SECRET!) as JwtPayload;
        req.userId = decoded.userId;
         next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }

   
};