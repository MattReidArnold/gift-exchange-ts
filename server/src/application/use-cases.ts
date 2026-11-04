import { AddParticipantUseCase } from '#src/application/use-cases/add-participant';
import { ClaimInviteUseCase } from '#src/application/use-cases/claim-invite';
import { CreateGroupUseCase } from '#src/application/use-cases/create-group';
import { DeleteGroupUseCase } from '#src/application/use-cases/delete-group';
import { GenerateMatchesUseCase } from '#src/application/use-cases/generate-matches';
import { GetGroupUseCase } from '#src/application/use-cases/get-group';
import { IssueParticipantInviteUseCase } from '#src/application/use-cases/issue-participant-invite';
import { ListGroupsUseCase } from '#src/application/use-cases/list-groups';
import { LockGroupUseCase } from '#src/application/use-cases/lock-group';
import { PreviewInviteUseCase } from '#src/application/use-cases/preview-invite';
import { RemoveParticipantUseCase } from '#src/application/use-cases/remove-participant';
import { RenameGroupUseCase } from '#src/application/use-cases/rename-group';
import { RevokeParticipantInviteUseCase } from '#src/application/use-cases/revoke-participant-invite';
import { UnlockGroupUseCase } from '#src/application/use-cases/unlock-group';
import { UpdateParticipantUseCase } from '#src/application/use-cases/update-participant';

export default interface UseCases {
  createGroup: CreateGroupUseCase;
  getGroup: GetGroupUseCase;
  listGroups: ListGroupsUseCase;
  renameGroup: RenameGroupUseCase;
  deleteGroup: DeleteGroupUseCase;
  addParticipant: AddParticipantUseCase;
  updateParticipant: UpdateParticipantUseCase;
  removeParticipant: RemoveParticipantUseCase;
  issueParticipantInvite: IssueParticipantInviteUseCase;
  revokeParticipantInvite: RevokeParticipantInviteUseCase;
  previewInvite: PreviewInviteUseCase;
  claimInvite: ClaimInviteUseCase;
  lockGroup: LockGroupUseCase;
  unlockGroup: UnlockGroupUseCase;
  generateMatches: GenerateMatchesUseCase;
}
