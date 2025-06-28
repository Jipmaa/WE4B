import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth-middleware';
import { validateRequest } from '../middleware/validate-request';
import { Discussion } from '../models/discussion';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware);

// Validation rules
const discussionIdValidation = [
  param('id').isMongoId().withMessage('Invalid discussion ID format'),
];

const messageIdValidation = [
  param('messageId').isMongoId().withMessage('Invalid message ID format'),
];

const createDiscussionValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('course').optional().isMongoId().withMessage('Invalid course ID format'),
  body('message').notEmpty().withMessage('Initial message is required'),
];

const addMessageValidation = [
  body('content').notEmpty().withMessage('Content is required'),
];

// @route   GET /api/discussions
// @desc    Get all discussions
// @access  Private
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const discussions = await Discussion.find()
    .populate('author', 'firstName lastName')
    .populate('course', 'name code');
  res.json({ success: true, data: discussions });
}));

// @route   GET /api/discussions/:id
// @desc    Get a discussion by ID
// @access  Private
router.get('/:id', discussionIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const discussion = await Discussion.findById(req.params.id)
    .populate('author', 'firstName lastName')
    .populate('messages.author', 'firstName lastName');

  if (!discussion) {
    throw new AppError('Discussion not found', 404);
  }

  res.json({ success: true, data: discussion });
}));

// @route   POST /api/discussions
// @desc    Create a new discussion
// @access  Private
router.post('/', createDiscussionValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const { title, course, message } = req.body;
  const author = req.user!.userId;

  const newDiscussion = new Discussion({
    title,
    author,
    course,
    messages: [{ content: message, author }],
  });

  await newDiscussion.save();
  res.status(201).json({ success: true, data: newDiscussion });
}));

// @route   POST /api/discussions/:id/messages
// @desc    Add a message to a discussion
// @access  Private
router.post('/:id/messages', [...discussionIdValidation, ...addMessageValidation], validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body;
  const author = (req as any).user.userId;

  const discussion = await Discussion.findById(req.params.id);

  if (!discussion) {
    throw new AppError('Discussion not found', 404);
  }

  discussion.messages.push({ content, author } as any);
  await discussion.save();

  res.status(201).json({ success: true, data: discussion });
}));

// @route   DELETE /api/discussions/:id
// @desc    Delete a discussion
// @access  Private
router.delete('/:id', discussionIdValidation, validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const discussion = await Discussion.findById(req.params.id);

  if (!discussion) {
    throw new AppError('Discussion not found', 404);
  }

  // Add authorization logic here if needed (e.g., only author or admin can delete)

  await discussion.deleteOne();
  res.json({ success: true, message: 'Discussion removed' });
}));

// @route   DELETE /api/discussions/:id/messages/:messageId
// @desc    Delete a message from a discussion
// @access  Private
router.delete('/:id/messages/:messageId', [...discussionIdValidation, ...messageIdValidation], validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const discussion = await Discussion.findById(req.params.id);

  if (!discussion) {
    throw new AppError('Discussion not found', 404);
  }

  const message = (discussion.messages as any).id(req.params.messageId);

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Add authorization logic here (e.g., only message author or admin can delete)

  message.remove();
  await discussion.save();

  res.json({ success: true, data: discussion });
}));

export default router;
