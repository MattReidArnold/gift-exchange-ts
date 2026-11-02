# Result and Failure

The server returns expected failures, like a validation error or a missing group, as typed values instead of throwing them. Because those failures are part of each function's return type, the compiler makes callers deal with them, and the controller can map each one to an HTTP status.

Exceptions are reserved for unexpected problems, such as a database outage or a bug.

## The two types

- [`Result<T, E>`](result.ts) is either `{ ok: true, value }` or `{ ok: false, error }`. Build one with `ok(value)` or `err(error)`.
- [`Failure<Type>`](failure.ts) is `{ type, reason }`. `type` is a string from an error enum such as `GiftExchangeGroupError`, and `reason` is a message that is safe to show to API clients.

They're almost always used together as `Result<T, Failure<SomeError>>`.

## Common patterns

**Return a success or a failure.** From [`GroupName.create`](../group-name.ts). Blank text is decided here, and [`GiftExchangeGroup.create`](../gift-exchange-group.ts) accepts the value object:

```ts
const value = raw.trim();
if (!value) {
  return err(groupNameEmptyFailure());
}
return ok(new GroupName(value));
```

**Pass a failure up.** Check `ok`, and return the result unchanged if it failed. TypeScript only lets you read `result.value` after the check. From [`update-participant.ts`](../../application/use-cases/update-participant.ts):

```ts
const result = group.updateParticipant(participantId, params);
if (!result.ok) {
  return result;
}

const savedGroup = await groupRepository.update(result.value);
return savedGroup ? ok(savedGroup) : err(groupSaveFailedFailure());
```

**Turn a missing record into a failure.** Repositories return `null` (or `false` from `delete`), and the use case decides what that means. From [`get-group.ts`](../../application/use-cases/get-group.ts):

```ts
const group = await groupRepository.getById(groupId);
return group ? ok(group) : err(groupNotFoundFailure());
```

**Handle it at the edge.** The controller turns a failure into an HTTP response. From [`group-controller.ts`](../../infrastructure/web/controllers/group-controller.ts):

```ts
const result = await getGroup.execute(req.params.groupId);
if (!result.ok) {
  return sendFailure(res, result.error);
}
return res.send(result.value);
```

`sendFailure` picks the status code with `statusForFailure`.

Use cases with no expected failures, such as `listGroups`, return plain values instead of a `Result`.

## Adding a new failure

1. Add a value to the error enum, such as `GiftExchangeGroupError` in [`gift-exchange-group-error.ts`](../gift-exchange-group-error.ts), or `GroupUseCaseError` for failures that only the application layer can detect.
2. Add a factory function next to it that returns the `Failure` with its `reason`.
3. Return it with `err(...)`, and add it to the `Result` type of every use case that can produce it.
4. Give it an HTTP status in `statusForFailure`. The switch is exhaustive, so the server won't compile until you do.

## Pitfalls

- **An unchecked result is silently ignored.** Nothing forces you to look at a returned `Result`, which is easiest to miss when the success value is `void`, as with `deleteGroup`. Always check `ok`.
- **Don't throw expected failures.** A thrown validation error skips the typed failure handling and reaches clients as a 500.
- **In tests,** use `expectOk` and `expectErr` from [`#tests/support/result`](../../../tests/support/result.ts). They unwrap a result and fail the test with the other side's contents when it's the wrong kind.
