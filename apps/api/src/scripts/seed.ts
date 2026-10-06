/** No-op seed for scaffold milestone. */
async function main(): Promise<void> {
  // intentional no-op
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
