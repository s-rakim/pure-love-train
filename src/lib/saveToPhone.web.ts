/** In a browser, saving a photo or video means downloading it. */
export async function saveToPhone(uri: string, name: string): Promise<void> {
  const link = document.createElement('a');
  link.href = uri;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
