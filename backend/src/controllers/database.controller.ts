import { Request, Response } from 'express';
import { DatabaseModel } from '../models/database.model';
import { DatabaseService } from '../services/database.service';

export const DatabaseController = {
  async list(req: Request, res: Response) {
    res.json(await DatabaseService.listForUser(req.user!.id));
  },

  async detail(req: Request, res: Response) {
    res.json(await DatabaseService.getDetail(Number(req.params.databaseId)));
  },

  async create(req: Request, res: Response) {
    const database = await DatabaseService.create({ ...req.body, created_by: req.user!.id });
    res.status(201).json(database);
  },

  async update(req: Request, res: Response) {
    res.json(await DatabaseService.update(Number(req.params.databaseId), req.body));
  },

  async listMembers(req: Request, res: Response) {
    res.json(await DatabaseModel.listMembers(Number(req.params.databaseId)));
  },

  async addMember(req: Request, res: Response) {
    const member = await DatabaseService.addMember(Number(req.params.databaseId), req.body.userId, req.body.role);
    res.status(201).json(member);
  },

  async removeMember(req: Request, res: Response) {
    await DatabaseService.removeMember(Number(req.params.databaseId), Number(req.params.userId));
    res.status(204).send();
  },

  async createField(req: Request, res: Response) {
    const field = await DatabaseService.createField(Number(req.params.databaseId), req.body);
    res.status(201).json(field);
  },

  async updateField(req: Request, res: Response) {
    res.json(await DatabaseService.updateField(Number(req.params.fieldId), Number(req.params.databaseId), req.body));
  },

  async deleteField(req: Request, res: Response) {
    await DatabaseService.deleteField(Number(req.params.fieldId), Number(req.params.databaseId));
    res.status(204).send();
  },

  async listRecords(req: Request, res: Response) {
    res.json(await DatabaseService.listRecords(Number(req.params.databaseId)));
  },

  async createRecord(req: Request, res: Response) {
    const record = await DatabaseService.createRecord(Number(req.params.databaseId), req.user!.id, req.body);
    res.status(201).json(record);
  },

  async updateRecord(req: Request, res: Response) {
    res.json(
      await DatabaseService.updateRecord(Number(req.params.recordId), Number(req.params.databaseId), req.body)
    );
  },

  async updateRecordFields(req: Request, res: Response) {
    res.json(
      await DatabaseService.updateRecordFields(
        Number(req.params.recordId),
        Number(req.params.databaseId),
        req.body.fields
      )
    );
  },

  async deleteRecord(req: Request, res: Response) {
    await DatabaseService.deleteRecord(Number(req.params.recordId), Number(req.params.databaseId));
    res.status(204).send();
  },
};
