import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/image_picker_service.dart';

class ReviewSubmissionScreen extends StatefulWidget {
  final Map<String, dynamic> booking;

  const ReviewSubmissionScreen({
    super.key,
    required this.booking,
  });

  @override
  State<ReviewSubmissionScreen> createState() => _ReviewSubmissionScreenState();
}

class _ReviewSubmissionScreenState extends State<ReviewSubmissionScreen> {
  int _rating = 5;
  final _commentController = TextEditingController();
  bool _isSubmitting = false;
  List<File> _selectedPhotos = [];
  static const int _maxPhotos = 5;

  Future<void> _pickPhoto() async {
    if (_selectedPhotos.length >= _maxPhotos) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Maximum $_maxPhotos photos allowed')),
      );
      return;
    }

    final file = await ImagePickerService.showImagePickerOptions(context);
    if (file != null) {
      setState(() {
        _selectedPhotos.add(file);
      });
    }
  }

  void _removePhoto(int index) {
    setState(() {
      _selectedPhotos.removeAt(index);
    });
  }

  Future<List<String>> _uploadPhotos() async {
    if (_selectedPhotos.isEmpty) return [];

    final token = await StorageService.getToken();
    if (token == null) throw Exception('No authentication token');

    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${AppConfig.properPlaceBackendUrl}/upload'),
    );
    request.headers['Authorization'] = 'Bearer $token';

    for (final photo in _selectedPhotos) {
      request.files.add(
        await http.MultipartFile.fromPath('images', photo.path),
      );
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final images = data['images'] as List;
      return images.map((img) => img['url'] as String).toList();
    } else {
      throw Exception('Failed to upload photos');
    }
  }

  Future<void> _submitReview() async {
    if (_commentController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write a comment')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      // Upload photos first if any
      List<String> photoUrls = [];
      if (_selectedPhotos.isNotEmpty) {
        photoUrls = await _uploadPhotos();
      }

      final token = await StorageService.getToken();
      final placeId = widget.booking['place_id'];
      
      final response = await http.post(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/reviews/places/$placeId'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'rating': _rating,
          'comment': _commentController.text,
          'photo_urls': photoUrls,
        }),
      );

      if (response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Review submitted successfully!')),
          );
          Navigator.of(context).pop(true); // Return true to indicate success
        }
      } else {
        final error = jsonDecode(response.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(error['message'] ?? 'Error submitting review')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Write a Review'),
        backgroundColor: const Color(0xFF7BA7D8),
      ),
      resizeToAvoidBottomInset: false,
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Place info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.booking['place_name'] ?? 'Place',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Let us know about your experience',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Rating section
            const Text(
              'Rating',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (int i = 1; i <= 5; i++)
                    IconButton(
                      iconSize: 36,
                      onPressed: () {
                        setState(() {
                          _rating = i;
                        });
                      },
                      icon: Icon(
                        i <= _rating ? Icons.star : Icons.star_outline,
                        color: const Color(0xFFFFB800),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Comment section
            const Text(
              'Your Comment',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _commentController,
              maxLines: 6,
              decoration: InputDecoration(
                hintText: 'Share your experience with the motorhome community...',
                hintStyle: TextStyle(color: Colors.grey[700]),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(
                    color: Color(0xFF7BA7D8),
                    width: 2,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Photos section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Add Photos (Optional)',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${_selectedPhotos.length}/$_maxPhotos',
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Share photos from your stay to help the motorhome community',
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
            const SizedBox(height: 12),
            
            // Photo grid
            if (_selectedPhotos.isNotEmpty)
              Container(
                height: 100,
                margin: const EdgeInsets.only(bottom: 12),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedPhotos.length,
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(
                              _selectedPhotos[index],
                              width: 100,
                              height: 100,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: GestureDetector(
                              onTap: () => _removePhoto(index),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.close,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

            // Add photo button
            if (_selectedPhotos.length < _maxPhotos)
              OutlinedButton.icon(
                onPressed: _pickPhoto,
                icon: const Icon(Icons.add_photo_alternate, color: Color(0xFF7BA7D8)),
                label: Text(
                  _selectedPhotos.isEmpty ? 'Add Photos' : 'Add More Photos',
                  style: const TextStyle(color: Color(0xFF7BA7D8)),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF7BA7D8)),
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            const SizedBox(height: 24),

            // Submit button
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitReview,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7BA7D8),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Submit Review',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }
}
