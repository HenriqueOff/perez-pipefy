import { Request, Response } from 'express';
import { PipelineModel } from '../models/pipeline.model';
import { PipelineService } from '../services/pipeline.service';
import { DashboardService } from '../services/dashboard.service';

export const PipelineController = {
  async list(req: Request, res: Response) {
    const pipelines = await PipelineService.listForUser(req.user!.id, req.user!.role === 'admin');
    res.json(pipelines);
  },

  async overview(req: Request, res: Response) {
    const overview = await PipelineService.getOverviewForUser(req.user!.id, req.user!.role === 'admin');
    res.json(overview);
  },

  async detail(req: Request, res: Response) {
    res.json(await PipelineService.getDetail(Number(req.params.pipelineId), req.user!.id));
  },

  async create(req: Request, res: Response) {
    const pipeline = await PipelineService.create({ ...req.body, created_by: req.user!.id });
    res.status(201).json(pipeline);
  },

  async update(req: Request, res: Response) {
    res.json(await PipelineService.update(Number(req.params.pipelineId), req.body));
  },

  async dashboard(req: Request, res: Response) {
    res.json(await DashboardService.getForPipeline(Number(req.params.pipelineId)));
  },

  async auditLog(req: Request, res: Response) {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    res.json(await PipelineService.getAuditLog(Number(req.params.pipelineId), limit, offset));
  },

  async adminInfo(req: Request, res: Response) {
    res.json(await PipelineService.getAdminInfo(Number(req.params.pipelineId)));
  },

  async listMembers(req: Request, res: Response) {
    res.json(await PipelineModel.listMembers(Number(req.params.pipelineId)));
  },

  async addMember(req: Request, res: Response) {
    const member = await PipelineService.addMember(Number(req.params.pipelineId), req.body.userId, req.body.role);
    res.status(201).json(member);
  },

  async removeMember(req: Request, res: Response) {
    await PipelineService.removeMember(Number(req.params.pipelineId), Number(req.params.userId));
    res.status(204).send();
  },

  // --- phases ---

  async createPhase(req: Request, res: Response) {
    const phase = await PipelineService.createPhase(Number(req.params.pipelineId), req.body);
    res.status(201).json(phase);
  },

  async updatePhase(req: Request, res: Response) {
    res.json(await PipelineService.updatePhase(Number(req.params.phaseId), req.body));
  },

  async setPhaseManualCardCreation(req: Request, res: Response) {
    const phase = await PipelineService.setPhaseManualCardCreation(Number(req.params.phaseId), req.body.allow);
    res.json(phase);
  },

  async deletePhase(req: Request, res: Response) {
    await PipelineService.deletePhase(Number(req.params.phaseId));
    res.status(204).send();
  },

  // --- custom fields ---

  async createCustomField(req: Request, res: Response) {
    const field = await PipelineService.createCustomField(Number(req.params.phaseId), req.body);
    res.status(201).json(field);
  },

  async updateCustomField(req: Request, res: Response) {
    res.json(await PipelineService.updateCustomField(Number(req.params.fieldId), req.body));
  },

  async deleteCustomField(req: Request, res: Response) {
    await PipelineService.deleteCustomField(Number(req.params.fieldId));
    res.status(204).send();
  },
};
