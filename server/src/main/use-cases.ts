import Dependencies from '#src/application/dependencies';
import UseCases from '#src/application/use-cases';
import addParticipant from '#src/application/use-cases/add-participant';
import claimInvite from '#src/application/use-cases/claim-invite';
import createGroup from '#src/application/use-cases/create-group';
import deleteGroup from '#src/application/use-cases/delete-group';
import generateMatches from '#src/application/use-cases/generate-matches';
import getGroup from '#src/application/use-cases/get-group';
import issueParticipantInvite from '#src/application/use-cases/issue-participant-invite';
import listGroups from '#src/application/use-cases/list-groups';
import previewInvite from '#src/application/use-cases/preview-invite';
import removeParticipant from '#src/application/use-cases/remove-participant';
import renameGroup from '#src/application/use-cases/rename-group';
import revokeParticipantInvite from '#src/application/use-cases/revoke-participant-invite';
import unlockGroup from '#src/application/use-cases/unlock-group';
import updateParticipant from '#src/application/use-cases/update-participant';

export default ({
  groupRepository,
  idGenerator,
  inviteTokens,
}: Dependencies): UseCases => ({
  createGroup: createGroup({ groupRepository }),
  getGroup: getGroup({ groupRepository }),
  listGroups: listGroups({ groupRepository }),
  renameGroup: renameGroup({ groupRepository }),
  deleteGroup: deleteGroup({ groupRepository }),
  addParticipant: addParticipant({ groupRepository, idGenerator }),
  updateParticipant: updateParticipant({ groupRepository }),
  removeParticipant: removeParticipant({ groupRepository }),
  issueParticipantInvite: issueParticipantInvite({ groupRepository, inviteTokens }),
  revokeParticipantInvite: revokeParticipantInvite({ groupRepository }),
  previewInvite: previewInvite({ groupRepository }),
  claimInvite: claimInvite({ groupRepository }),
  unlockGroup: unlockGroup({ groupRepository }),
  generateMatches: generateMatches({ groupRepository }),
});
