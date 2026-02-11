import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class ImagePickerService {
  static final ImagePicker _imagePicker = ImagePicker();

  /// Pick a single image from gallery
  static Future<File?> pickImageFromGallery() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 100,
      );
      if (pickedFile != null) {
        return File(pickedFile.path);
      }
    } catch (e) {
      print('Error picking image from gallery: $e');
    }
    return null;
  }

  /// Pick image from camera
  static Future<File?> pickImageFromCamera() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 100,
      );
      if (pickedFile != null) {
        return File(pickedFile.path);
      }
    } catch (e) {
      print('Error picking image from camera: $e');
    }
    return null;
  }

  /// Show image picker options dialog
  static Future<File?> showImagePickerOptions(context) async {
    return showDialog<File?>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Select Image'),
        content: const Text('Choose an option'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
            },
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final file = await pickImageFromCamera();
              if (context.mounted && file != null) {
                Navigator.pop(context, file);
              }
            },
            child: const Text('Camera'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final file = await pickImageFromGallery();
              if (context.mounted && file != null) {
                Navigator.pop(context, file);
              }
            },
            child: const Text('Gallery'),
          ),
        ],
      ),
    );
  }
}
