const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Get the token from the Authorization header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        // Check if the token is missing
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized - No token provided"
            });
        }
        
        // // Verify the token
        const decoded = await jwt.verify(token, process.env.authenticationKey);

        // // Attach the decoded user information to the request object
        req.user = decoded?.id;

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "Unauthorized - Invalid token"
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Unauthorized - Token expired"
            });
        }

        // Handle other errors
        console.error(error); // Log the error for debugging
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

module.exports = authMiddleware;