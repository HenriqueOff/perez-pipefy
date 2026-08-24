import { Router } from 'express';
import { DatabaseController } from '../controllers/database.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireDatabaseRole } from '../middlewares/requireDatabaseRole';
import { validateBody } from '../middlewares/validate';
import {
  addDatabaseMemberSchema,
  createDatabaseFieldSchema,
  createDatabaseRecordSchema,
  createDatabaseSchema,
  updateDatabaseFieldSchema,
  updateDatabaseRecordFieldsSchema,
  updateDatabaseRecordSchema,
  updateDatabaseSchema,
} from '../validators/database.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(DatabaseController.list));
router.post('/', validateBody(createDatabaseSchema), asyncHandler(DatabaseController.create));
router.get('/:databaseId', requireDatabaseRole('viewer'), asyncHandler(DatabaseController.detail));
router.patch(
  '/:databaseId',
  requireDatabaseRole('manager'),
  validateBody(updateDatabaseSchema),
  asyncHandler(DatabaseController.update)
);

router.get('/:databaseId/members', requireDatabaseRole('viewer'), asyncHandler(DatabaseController.listMembers));
router.post(
  '/:databaseId/members',
  requireDatabaseRole('manager'),
  validateBody(addDatabaseMemberSchema),
  asyncHandler(DatabaseController.addMember)
);
router.delete(
  '/:databaseId/members/:userId',
  requireDatabaseRole('manager'),
  asyncHandler(DatabaseController.removeMember)
);

router.post(
  '/:databaseId/fields',
  requireDatabaseRole('manager'),
  validateBody(createDatabaseFieldSchema),
  asyncHandler(DatabaseController.createField)
);
router.patch(
  '/:databaseId/fields/:fieldId',
  requireDatabaseRole('manager'),
  validateBody(updateDatabaseFieldSchema),
  asyncHandler(DatabaseController.updateField)
);
router.delete(
  '/:databaseId/fields/:fieldId',
  requireDatabaseRole('manager'),
  asyncHandler(DatabaseController.deleteField)
);

router.get('/:databaseId/records', requireDatabaseRole('viewer'), asyncHandler(DatabaseController.listRecords));
router.post(
  '/:databaseId/records',
  requireDatabaseRole('editor'),
  validateBody(createDatabaseRecordSchema),
  asyncHandler(DatabaseController.createRecord)
);
router.patch(
  '/:databaseId/records/:recordId',
  requireDatabaseRole('editor'),
  validateBody(updateDatabaseRecordSchema),
  asyncHandler(DatabaseController.updateRecord)
);
router.patch(
  '/:databaseId/records/:recordId/fields',
  requireDatabaseRole('editor'),
  validateBody(updateDatabaseRecordFieldsSchema),
  asyncHandler(DatabaseController.updateRecordFields)
);
router.delete(
  '/:databaseId/records/:recordId',
  requireDatabaseRole('manager'),
  asyncHandler(DatabaseController.deleteRecord)
);

export default router;
