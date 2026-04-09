export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  // Serve /builds/meta/* from /_nuxt/builds/meta/*
  if (path.startsWith('/builds/meta/')) {
    const newPath = path.replace('/builds/', '/_nuxt/builds/');
    const filePath = join(process.cwd(), '.output/public', newPath);
    return sendFile(event, filePath);
  }
});
