import express from "express";

const router = express.Router();

router.post('/test-sanitize', (req, res) => {
    res.json({
        message: 'Sanitization test',
        recieved: req.body,
        timestamp: new Date().toISOString()
    });
});

export default router;