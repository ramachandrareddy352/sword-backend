import cloudinary from "../config/cloudinary";

export const uploadToCloudinary = (fileBuffer: Buffer, folder: string) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        }
        resolve(result);
      })
      .end(fileBuffer);
  });
};
