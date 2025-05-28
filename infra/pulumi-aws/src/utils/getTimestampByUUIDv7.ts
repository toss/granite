export function getTimestampByUUIDv7(uuid: string) {
  const timestampHex = uuid.split('-').join('').slice(0, 12);

  const timestamp = Number.parseInt(timestampHex, 16);

  return timestamp;
}

export function toDeployedAtString(date: Date) {
  return [
    date.getFullYear(),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
    date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
  ].join('');
}
