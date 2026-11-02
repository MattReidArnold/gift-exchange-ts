import { Request, Response, NextFunction } from 'express';

import Logger from '#src/application/ports/logger';
import { AddParticipantUseCase } from '#src/application/use-cases/add-participant';
import { CreateGroupUseCase } from '#src/application/use-cases/create-group';
import { DeleteGroupUseCase } from '#src/application/use-cases/delete-group';
import { GetGroupUseCase } from '#src/application/use-cases/get-group';
import { ListGroupsUseCase } from '#src/application/use-cases/list-groups';
import { RemoveParticipantUseCase } from '#src/application/use-cases/remove-participant';
import { RenameGroupUseCase } from '#src/application/use-cases/rename-group';
import { UpdateParticipantUseCase } from '#src/application/use-cases/update-participant';
import { sendFailure } from '#src/infrastructure/web/status-for-failure';

type GroupControllerDeps = {
  logger: Logger;
  createGroup: CreateGroupUseCase;
  getGroup: GetGroupUseCase;
  listGroups: ListGroupsUseCase;
  renameGroup: RenameGroupUseCase;
  deleteGroup: DeleteGroupUseCase;
  addParticipant: AddParticipantUseCase;
  updateParticipant: UpdateParticipantUseCase;
  removeParticipant: RemoveParticipantUseCase;
};

type GroupParams = { groupId: string };
type ParticipantParams = { groupId: string; participantId: string };

const stringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const stringArrayOrUndefined = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

const groupController = ({
  logger,
  createGroup,
  getGroup,
  listGroups,
  renameGroup,
  deleteGroup,
  addParticipant,
  updateParticipant,
  removeParticipant,
}: GroupControllerDeps) => {
  const create = async (req: Request, res: Response, _next: NextFunction) => {
    const ownerId = req.user?.id;
    if (!ownerId) {
      return res.status(401).send({
        failure: {
          type: 'UNAUTHENTICATED',
          reason: 'Sign in to continue',
        },
      });
    }
    const name = stringOrUndefined(req.body?.name) ?? '';
    const result = await createGroup.execute(name, ownerId);
    if (!result.ok) {
      logger.info('failed to create group', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    const group = result.value;
    logger.info('group created', JSON.stringify(group));
    return res.status(201).send(group);
  };

  const list = async (_req: Request, res: Response, _next: NextFunction) => {
    const groups = await listGroups.execute();
    return res.send(groups);
  };

  const find = async (
    req: Request<GroupParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const result = await getGroup.execute(req.params.groupId);
    if (!result.ok) {
      return sendFailure(res, result.error);
    }
    return res.send(result.value);
  };

  const rename = async (
    req: Request<GroupParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const name = stringOrUndefined(req.body?.name) ?? '';
    const result = await renameGroup.execute(req.params.groupId, name);
    if (!result.ok) {
      logger.info('failed to rename group', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    return res.send(result.value);
  };

  const remove = async (
    req: Request<GroupParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const { groupId } = req.params;
    const result = await deleteGroup.execute(groupId);
    if (!result.ok) {
      logger.info('failed to delete group', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    logger.info('group deleted', groupId);
    return res.status(204).send();
  };

  const addMember = async (
    req: Request<GroupParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const result = await addParticipant.execute(req.params.groupId, {
      name: stringOrUndefined(req.body?.name) ?? '',
      exclusions: stringArrayOrUndefined(req.body?.exclusions) ?? [],
    });
    if (!result.ok) {
      logger.info('failed to add participant', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    return res.status(201).send(result.value);
  };

  const updateMember = async (
    req: Request<ParticipantParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const { groupId, participantId } = req.params;
    const result = await updateParticipant.execute(groupId, participantId, {
      name: stringOrUndefined(req.body?.name),
      exclusions: stringArrayOrUndefined(req.body?.exclusions),
    });
    if (!result.ok) {
      logger.info('failed to update participant', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    return res.send(result.value);
  };

  const removeMember = async (
    req: Request<ParticipantParams>,
    res: Response,
    _next: NextFunction
  ) => {
    const { groupId, participantId } = req.params;
    const result = await removeParticipant.execute(groupId, participantId);
    if (!result.ok) {
      logger.info('failed to remove participant', JSON.stringify(result.error));
      return sendFailure(res, result.error);
    }
    return res.send(result.value);
  };

  return {
    create,
    list,
    find,
    rename,
    remove,
    addMember,
    updateMember,
    removeMember,
  };
};

export default groupController;
