export class ImageTestUtils {
  static async createTextImage(text: string, font: string = "30px Arial"): Promise<{bitmap: ImageBitmap, dataUrl: string}> {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.font = font;
      ctx.fillText(text, 20, 100);
    }
    return {
      bitmap: await createImageBitmap(canvas),
      dataUrl: canvas.toDataURL()
    };
  }

  static async createShapeImage(): Promise<{bitmap: ImageBitmap, dataUrl: string}> {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(100, 100, 80, 0, 2 * Math.PI);
      ctx.fill();
    }
    return {
      bitmap: await createImageBitmap(canvas),
      dataUrl: canvas.toDataURL()
    };
  }

  static async fetchImage(url: string): Promise<{bitmap: ImageBitmap, dataUrl: string}> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 500;
          canvas.height = img.naturalHeight || img.height || 500;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          const bitmap = await createImageBitmap(canvas);
          resolve({ bitmap, dataUrl: url });
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
      img.src = url;
    });
  }
}
