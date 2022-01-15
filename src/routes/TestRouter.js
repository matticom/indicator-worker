import express from 'express';
const router = express.Router({ mergeParams: true });

router.get('/test', async (req, res) => {
   res.status(200).send({ data: 'test' });
});

export default router;
