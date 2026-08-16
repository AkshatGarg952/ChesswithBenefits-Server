import { z } from 'zod';

export const commentaryRequestSchema = z.object({
  prompt: z.object({
    mode: z.enum(['beginner', 'roast', 'hype']),
    move: z.string().min(1),
    fen: z.string().min(1),
    lastMoves: z.array(z.string()).optional().default([]),
    isUserMove: z.boolean().optional(),
  }),
});
