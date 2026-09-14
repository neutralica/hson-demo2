export const tick = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};
