

Bun.serve({
  port: 3000,
  fetch() {
    return new Response(
      new ReadableStream({
        start(controller) {
          let count = 0;
          const intervalId = setInterval(() => {
            controller.enqueue(`data: ${new Date().toISOString()}\n\n`);        
            count++;
            if (count >= 10) {
              clearInterval(intervalId);
              controller.close();
            }
          }, 1000);
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
})