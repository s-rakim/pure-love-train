/** In a browser, saving a photo means downloading it. */
export async function savePhoto(uri: string, name: string): Promise<void> {
  const link = document.createElement('a');
  link.href = uri;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
