import GiftExchangeGroup from '#src/domain/gift-exchange-group';
import ParticipantName from '#src/domain/participant-name';
import {
  GiftExchangeGroupError,
  ParticipantValidationError,
} from '#src/domain/gift-exchange-group-error';
import { Failure } from '#src/domain/shared/failure';
import { Result, err, ok } from '#src/domain/shared/result';
import GiftExchangeGroupRepository from '#src/application/ports/gift-exchange-group-repository';
import IdGenerator from '#src/application/ports/id-generator';
import {
  GroupUseCaseError,
  groupNotFoundFailure,
  groupSaveFailedFailure,
} from '#src/application/use-cases/group-failures';

type AddParticipantResult = Result<
  GiftExchangeGroup,
  Failure<
    | GroupUseCaseError
    | GiftExchangeGroupError.ParticipantNameEmpty
    | GiftExchangeGroupError.GroupLocked
    | ParticipantValidationError
  >
>;

type AddParticipantParams = {
  name: string;
  exclusions: string[];
};

type AddParticipantDeps = {
  groupRepository: GiftExchangeGroupRepository;
  idGenerator: IdGenerator;
};

const addParticipant = ({ groupRepository, idGenerator }: AddParticipantDeps) => {
  const execute = async (
    groupId: string,
    { name, exclusions }: AddParticipantParams
  ): Promise<AddParticipantResult> => {
    const group = await groupRepository.getById(groupId);
    if (!group) {
      return err(groupNotFoundFailure());
    }

    const participantName = ParticipantName.create(name);
    if (!participantName.ok) {
      return participantName;
    }

    const result = group.addParticipant({
      id: idGenerator.generate(),
      name: participantName.value,
      exclusions,
    });
    if (!result.ok) {
      return result;
    }

    const savedGroup = await groupRepository.update(result.value);
    return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
  };

  return {
    execute,
  };
};

export type AddParticipantUseCase = ReturnType<typeof addParticipant>;

export default addParticipant;
