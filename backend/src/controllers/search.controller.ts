import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';

export const SearchController = {
  async search(req: Request, res: Response) {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await SearchService.searchCards(req.user!.id, req.user!.role === 'admin', query);
    res.json(results);
  },
};
