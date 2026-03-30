import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

class AdminApprovalDetailScreen extends StatefulWidget {
  final Map<String, dynamic> place;
  final VoidCallback? onApproved;
  final VoidCallback? onRejected;

  const AdminApprovalDetailScreen({
    super.key,
    required this.place,
    this.onApproved,
    this.onRejected,
  });

  @override
  State<AdminApprovalDetailScreen> createState() => _AdminApprovalDetailScreenState();
}

class _AdminApprovalDetailScreenState extends State<AdminApprovalDetailScreen> {
  late PageController _imageController;
  int _currentImageIndex = 0;
  bool _isApproving = false;
  bool _isRejecting = false;
  bool _isRemoving = false;

  @override
  void initState() {
    super.initState();
    _imageController = PageController();
  }

  @override
  void dispose() {
    _imageController.dispose();
    super.dispose();
  }

  List<String> get _imageUrls {
    final raw = widget.place['raw'] ?? widget.place;
    final imageUrls = raw['image_urls'];
    final imageUrl = raw['image_url'] ?? widget.place['image'];
    
    if (imageUrls is List && imageUrls.isNotEmpty) {
      return imageUrls.map((e) => e.toString()).toList();
    } else if (imageUrl != null && imageUrl.toString().isNotEmpty) {
      return [imageUrl.toString()];
    }
    return [];
  }

  String get _hostName => widget.place['hostName'] ?? widget.place['host_name'] ?? 'Unknown Host';
  String get _hostEmail => widget.place['hostEmail'] ?? widget.place['host_email'] ?? '';
  int get _hostTotalSites => int.tryParse((widget.place['raw']?['host_total_sites'] ?? widget.place['host_total_sites'])?.toString() ?? '') ?? 0;
  int get _hostApprovedSites => int.tryParse((widget.place['raw']?['host_approved_sites'] ?? widget.place['host_approved_sites'])?.toString() ?? '') ?? 0;
  String get _hostJoinedAt => widget.place['raw']?['host_joined_at'] ?? widget.place['host_joined_at'] ?? '';
  bool get _hostContractSigned => widget.place['host_contract_signed'] == true || widget.place['raw']?['host_contract_accepted_at'] != null;
  String get _status => widget.place['status']?.toString().toLowerCase() ?? 'pending';
  bool get _isPending => _status == 'pending' || _status == 'changes pending';
  bool get _isApproved => _status == 'approved';
  bool get _isRejected => _status == 'rejected';

  // Change detection helpers
  Map<String, dynamic>? get _previousData {
    final raw = widget.place['raw'] ?? widget.place;
    final prev = raw['previous_approved_data'];
    if (prev is Map<String, dynamic>) return prev;
    return null;
  }

  bool get _hasChanges => _previousData != null && _isPending;

  bool _isChanged(String field) {
    if (_previousData == null) return false;
    final raw = widget.place['raw'] ?? widget.place;
    final current = raw[field]?.toString() ?? '';
    final previous = _previousData![field]?.toString() ?? '';
    return current != previous;
  }

  bool _isAnyChanged(List<String> fields) {
    return fields.any((f) => _isChanged(f));
  }

  String? _previousValue(String field) {
    if (_previousData == null) return null;
    final val = _previousData![field];
    if (val == null) return null;
    return val.toString();
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return 'Unknown';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('MMM d, yyyy').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  Future<void> _approvePlace() async {
    setState(() => _isApproving = true);
    try {
      final placeId = widget.place['id']?.toString() ?? '';
      await ApiService.approvePlace(placeId: placeId);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${widget.place['name']} approved successfully'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onApproved?.call();
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to approve: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isApproving = false);
    }
  }

  void _showRejectDialog() {
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Site'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to reject "${widget.place['name']}"?',
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Reason for rejection (optional)',
                hintStyle: TextStyle(color: Colors.grey[500]),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _rejectPlace(reasonController.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Reject', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _rejectPlace(String reason) async {
    setState(() => _isRejecting = true);
    try {
      final placeId = widget.place['id']?.toString() ?? '';
      await ApiService.rejectPlace(placeId: placeId, reason: reason);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${widget.place['name']} rejected'),
            backgroundColor: Colors.orange,
          ),
        );
        widget.onRejected?.call();
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to reject: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isRejecting = false);
    }
  }

  Future<void> _contactHost() async {
    if (_hostEmail.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No email address available for this host'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: _hostEmail,
      queryParameters: {
        'subject': 'Regarding your site: ${widget.place['name']}',
      },
    );
    
    try {
      if (await canLaunchUrl(emailUri)) {
        await launchUrl(emailUri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not open email app. Host email: $_hostEmail'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening email: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showRemoveDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Site'),
        content: Text(
          'Are you sure you want to remove "${widget.place['name']}"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _removePlace();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Remove', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _removePlace() async {
    setState(() => _isRemoving = true);
    try {
      final placeId = widget.place['id']?.toString() ?? '';
      await ApiService.deletePlace(placeId: placeId);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${widget.place['name']} has been removed'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to remove site: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isRemoving = false);
    }
  }

  Future<void> _reopenPlace() async {
    setState(() => _isApproving = true);
    try {
      final placeId = widget.place['id']?.toString() ?? '';
      await ApiService.reopenPlace(placeId: placeId);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${widget.place['name']} has been reopened for review'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onApproved?.call();
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to reopen site: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isApproving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final raw = widget.place['raw'] ?? widget.place;
    final priceRaw = raw['price_per_night'] ?? 0;
    final price = priceRaw is String ? double.tryParse(priceRaw) ?? 0.0 : (priceRaw is num ? priceRaw.toDouble() : 0.0);
    final amenities = raw['amenities'] ?? widget.place['amenities'] ?? [];
    final description = raw['description'] ?? widget.place['description'] ?? 'No description provided';
    final address = raw['address'] ?? widget.place['address'] ?? '';
    final city = raw['city'] ?? '';
    final country = raw['country'] ?? '';
    final fullAddress = [address, city, country].where((s) => s.isNotEmpty).join(', ');
    final capacity = raw['capacity'] ?? 1;
    final submittedAt = raw['created_at'] ?? widget.place['submissionDate'] ?? '';

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: CustomScrollView(
        slivers: [
          // App Bar with Images
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: const Color(0xFF3B82F6),
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.3),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_back, color: Colors.white),
              ),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: _imageUrls.isEmpty
                  ? Container(
                      color: Colors.grey[300],
                      child: const Center(
                        child: Icon(Icons.image, size: 64, color: Colors.grey),
                      ),
                    )
                  : Stack(
                      children: [
                        PageView.builder(
                          controller: _imageController,
                          itemCount: _imageUrls.length,
                          onPageChanged: (index) {
                            setState(() => _currentImageIndex = index);
                          },
                          itemBuilder: (context, index) {
                            return Image.network(
                              _imageUrls[index],
                              fit: BoxFit.cover,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Container(
                                  color: Colors.grey[300],
                                  child: const Center(child: CircularProgressIndicator()),
                                );
                              },
                              errorBuilder: (context, error, stackTrace) => Container(
                                color: Colors.grey[300],
                                child: const Icon(Icons.error, size: 64, color: Colors.grey),
                              ),
                            );
                          },
                        ),
                        if (_imageUrls.length > 1)
                          Positioned(
                            bottom: 16,
                            left: 0,
                            right: 0,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(_imageUrls.length, (index) {
                                return Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: _currentImageIndex == index ? 24 : 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: _currentImageIndex == index
                                        ? Colors.white
                                        : Colors.white.withOpacity(0.5),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                );
                              }),
                            ),
                          ),
                        // Status badge
                        Positioned(
                          top: 100,
                          right: 16,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _isPending ? Colors.amber : (_isApproved ? Colors.green : Colors.red),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _isPending 
                                ? (_hasChanges ? 'CHANGES PENDING APPROVAL' : 'PENDING APPROVAL') 
                                : (_isApproved ? 'APPROVED' : 'REJECTED'),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Changes banner
                if (_hasChanges)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    color: const Color(0xFFFFF8E1),
                    child: Row(
                      children: [
                        const Icon(Icons.edit_note, color: Color(0xFFF57F17), size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'This is a re-submission of a previously approved site. Changed fields are highlighted.',
                            style: TextStyle(color: Colors.amber[900], fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Title and Price
                _wrapSection(
                  changed: _hasChanges && _isAnyChanged(['name', 'address', 'city', 'country', 'price_per_night', 'capacity']),
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    color: Colors.white,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldRow(
                          widget.place['name'] ?? 'Unnamed Site',
                          'name',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Expanded(
                              child: _buildFieldRow(
                                fullAddress.isNotEmpty ? fullAddress : 'Address not provided',
                                'address',
                                style: TextStyle(color: Colors.grey[600], fontSize: 14),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF3B82F6).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: _buildFieldRow(
                                '£${price.toStringAsFixed(0)}/night',
                                'price_per_night',
                                style: const TextStyle(color: Color(0xFF3B82F6), fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Icon(Icons.people, size: 16, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            _buildFieldRow(
                              'Up to $capacity guests',
                              'capacity',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Submitted: ${_formatDate(submittedAt)}',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 8),

                // Host Information Card (never changes — always same host)
                Container(
                  padding: const EdgeInsets.all(20),
                  color: Colors.white,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.person, color: Color(0xFF3B82F6)),
                          const SizedBox(width: 8),
                          const Text(
                            'Host Information',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildHostInfoRow(Icons.account_circle, 'Name', _hostName),
                      const SizedBox(height: 12),
                      _buildHostInfoRow(Icons.email, 'Email', _hostEmail),
                      const SizedBox(height: 12),
                      _buildHostInfoRow(
                        Icons.calendar_today,
                        'Member Since',
                        _formatDate(_hostJoinedAt),
                      ),
                      const SizedBox(height: 12),
                      _buildHostInfoRow(
                        Icons.home_work,
                        'Total Sites',
                        '$_hostTotalSites site${_hostTotalSites == 1 ? '' : 's'} ($_hostApprovedSites approved)',
                      ),
                      const SizedBox(height: 12),
                      _buildHostInfoRow(
                        Icons.description,
                        'Host Agreement',
                        _hostContractSigned ? 'Signed ✓' : 'Not signed',
                      ),
                      if (!_hostContractSigned)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red.withOpacity(0.3)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.warning_amber_rounded, color: Colors.red, size: 20),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'This host has not signed the Host Agreement. The site cannot be approved until the contract is signed.',
                                    style: TextStyle(
                                      color: Colors.red,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      if (_hostApprovedSites == 0 && _hostTotalSites == 1)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.amber.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.amber.withOpacity(0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.new_releases, color: Colors.amber, size: 20),
                                const SizedBox(width: 8),
                                const Expanded(
                                  child: Text(
                                    'This is the host\'s first site submission',
                                    style: TextStyle(
                                      color: Colors.amber,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 8),

                // Site Type & Details
                _wrapSection(
                  changed: _hasChanges && _isAnyChanged(['place_type', 'opening_hours']),
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    color: Colors.white,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Site Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        _buildDetailField('Type', _formatPlaceType(raw['place_type']?.toString() ?? 'private_land'), 'place_type'),
                        if (raw['opening_hours'] != null && raw['opening_hours'].toString().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          _buildDetailField('Opening Hours', raw['opening_hours'].toString(), 'opening_hours'),
                        ],
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 8),

                // Description
                _wrapSection(
                  changed: _hasChanges && _isChanged('description'),
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    color: Colors.white,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Description', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        Text(
                          description,
                          style: TextStyle(
                            color: (_hasChanges && _isChanged('description')) ? Colors.orange[800] : Colors.grey[700],
                            height: 1.5,
                            fontSize: 14,
                          ),
                        ),
                        if (_hasChanges && _isChanged('description') && _previousValue('description') != null) ...[
                          const SizedBox(height: 8),
                          _buildPreviousValueLabel(_previousValue('description')!),
                        ],
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 8),

                // Business Description
                if ((raw['business_description'] ?? '').toString().isNotEmpty)
                  _wrapSection(
                    changed: _hasChanges && _isChanged('business_description'),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      color: Colors.white,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Business Description', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          Text(
                            raw['business_description'].toString(),
                            style: TextStyle(
                              color: (_hasChanges && _isChanged('business_description')) ? Colors.orange[800] : Colors.grey[700],
                              height: 1.5,
                              fontSize: 14,
                            ),
                          ),
                          if (_hasChanges && _isChanged('business_description') && _previousValue('business_description') != null) ...[
                            const SizedBox(height: 8),
                            _buildPreviousValueLabel(_previousValue('business_description')!),
                          ],
                        ],
                      ),
                    ),
                  ),

                if ((raw['business_description'] ?? '').toString().isNotEmpty) const SizedBox(height: 8),

                // Access Route & Vehicle Restrictions
                if ((raw['access_route_description'] ?? '').toString().isNotEmpty || 
                    raw['max_vehicle_height_ft'] != null || raw['max_vehicle_width_ft'] != null || raw['max_vehicle_length_ft'] != null)
                  _wrapSection(
                    changed: _hasChanges && _isAnyChanged(['access_route_description', 'max_vehicle_height_ft', 'max_vehicle_width_ft', 'max_vehicle_length_ft']),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      color: Colors.white,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Access & Vehicle Info', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          if ((raw['access_route_description'] ?? '').toString().isNotEmpty) ...[
                            _buildDetailField('Access Route', raw['access_route_description'].toString(), 'access_route_description'),
                            const SizedBox(height: 8),
                          ],
                          if (raw['max_vehicle_height_ft'] != null)
                            _buildDetailField('Max Height', '${raw['max_vehicle_height_ft']} ft', 'max_vehicle_height_ft'),
                          if (raw['max_vehicle_width_ft'] != null)
                            _buildDetailField('Max Width', '${raw['max_vehicle_width_ft']} ft', 'max_vehicle_width_ft'),
                          if (raw['max_vehicle_length_ft'] != null)
                            _buildDetailField('Max Length', '${raw['max_vehicle_length_ft']} ft', 'max_vehicle_length_ft'),
                        ],
                      ),
                    ),
                  ),

                if ((raw['access_route_description'] ?? '').toString().isNotEmpty || raw['max_vehicle_height_ft'] != null)
                  const SizedBox(height: 8),

                // Food & Kitchen
                if ((raw['serves_food'] == true || raw['serves_food'] == 'true') || 
                    (raw['kitchen_hours'] ?? '').toString().isNotEmpty || 
                    (raw['food_menu_description'] ?? '').toString().isNotEmpty)
                  _wrapSection(
                    changed: _hasChanges && _isAnyChanged(['serves_food', 'kitchen_hours', 'food_menu_description']),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      color: Colors.white,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Food & Kitchen', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          if (raw['serves_food'] == true || raw['serves_food'] == 'true')
                            _buildDetailField('Serves Food', 'Yes', 'serves_food'),
                          if ((raw['kitchen_hours'] ?? '').toString().isNotEmpty)
                            _buildDetailField('Kitchen Hours', raw['kitchen_hours'].toString(), 'kitchen_hours'),
                          if ((raw['food_menu_description'] ?? '').toString().isNotEmpty) ...[
                            const SizedBox(height: 4),
                            _buildDetailField('Menu', raw['food_menu_description'].toString(), 'food_menu_description'),
                          ],
                        ],
                      ),
                    ),
                  ),

                const SizedBox(height: 8),

                // Amenities
                if (amenities is List && amenities.isNotEmpty)
                  _wrapSection(
                    changed: _hasChanges && _isChanged('amenities'),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      color: Colors.white,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Amenities', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: (amenities as List).map((amenity) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(_getAmenityIcon(amenity.toString()), size: 16, color: Colors.grey[700]),
                                    const SizedBox(width: 6),
                                    Text(amenity.toString(), style: TextStyle(color: Colors.grey[700], fontSize: 13)),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),

                const SizedBox(height: 8),

                // Location Map
                _buildLocationMap(raw),

                // Spacer for bottom buttons
                const SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: MediaQuery.of(context).padding.bottom + 16,
          top: 16,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: _isPending ? _buildPendingButtons() : (_isRejected ? _buildRejectedButtons() : _buildApprovedButtons()),
      ),
    );
  }

  Widget _buildPendingButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _isRejecting || _isApproving ? null : _showRejectDialog,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: const BorderSide(color: Colors.red),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isRejecting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red),
                  )
                : const Text(
                    'Reject',
                    style: TextStyle(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          flex: 2,
          child: ElevatedButton(
            onPressed: _isApproving || _isRejecting || !_hostContractSigned ? null : _approvePlace,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isApproving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(
                    !_hostContractSigned ? 'Contract Not Signed' : 'Approve Site',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildApprovedButtons() {
    return Row(
      children: [
        // Small Remove Site button
        SizedBox(
          width: 100,
          child: OutlinedButton(
            onPressed: _isRemoving ? null : _showRemoveDialog,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: const BorderSide(color: Colors.red),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isRemoving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red),
                  )
                : const Text(
                    'Remove',
                    style: TextStyle(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
          ),
        ),
        const SizedBox(width: 16),
        // Contact Host button
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _contactHost,
            icon: const Icon(Icons.email, color: Colors.white),
            label: const Text(
              'Contact Host',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRejectedButtons() {
    return Row(
      children: [
        // Contact Host button (50% width)
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _contactHost,
            icon: const Icon(Icons.phone, color: Colors.white),
            label: const Text(
              'Contact Host',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Reopen Site button (50% width)
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _isApproving ? null : _reopenPlace,
            icon: const Icon(Icons.lock_open, color: Colors.white),
            label: _isApproving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text(
                    'Reopen Site',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHostInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLocationMap(Map<String, dynamic> raw) {
    final latRaw = raw['latitude'];
    final lngRaw = raw['longitude'];
    
    final lat = latRaw is String ? double.tryParse(latRaw) : (latRaw is num ? latRaw.toDouble() : null);
    final lng = lngRaw is String ? double.tryParse(lngRaw) : (lngRaw is num ? lngRaw.toDouble() : null);

    if (lat == null || lng == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        color: Colors.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Location',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Container(
              height: 150,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  'Location coordinates not available',
                  style: TextStyle(color: Colors.grey[500]),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Location',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              height: 200,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: LatLng(lat, lng),
                  zoom: 15,
                ),
                markers: {
                  Marker(
                    markerId: const MarkerId('place'),
                    position: LatLng(lat, lng),
                    infoWindow: InfoWindow(title: widget.place['name'] ?? 'Site Location'),
                  ),
                },
                zoomControlsEnabled: true,
                scrollGesturesEnabled: true,
                zoomGesturesEnabled: true,
                tiltGesturesEnabled: false,
                rotateGesturesEnabled: false,
                myLocationButtonEnabled: false,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Wraps a section with an amber left border when it has changes
  Widget _wrapSection({required bool changed, required Widget child}) {
    if (!changed) return child;
    return Container(
      decoration: const BoxDecoration(
        border: Border(left: BorderSide(color: Color(0xFFFFB300), width: 4)),
      ),
      child: Stack(
        children: [
          child,
          Positioned(
            top: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8E1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFFFB300)),
              ),
              child: const Text(
                'CHANGED',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFF57F17)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Renders a text field, showing the current value with inline change indicator
  Widget _buildFieldRow(String value, String field, {TextStyle? style}) {
    final changed = _hasChanges && _isChanged(field);
    final effectiveStyle = changed
        ? (style ?? const TextStyle()).copyWith(color: Colors.orange[800])
        : style;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: effectiveStyle),
        if (changed && _previousValue(field) != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              'Was: ${_previousValue(field)}',
              style: TextStyle(fontSize: 11, color: Colors.grey[500], fontStyle: FontStyle.italic, decoration: TextDecoration.lineThrough),
            ),
          ),
      ],
    );
  }

  /// Renders a label: value detail field with change info
  Widget _buildDetailField(String label, String value, String field) {
    final changed = _hasChanges && _isChanged(field);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13, fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: TextStyle(fontSize: 13, color: changed ? Colors.orange[800] : null)),
                if (changed && _previousValue(field) != null)
                  Text(
                    'Was: ${_previousValue(field)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500], fontStyle: FontStyle.italic, decoration: TextDecoration.lineThrough),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Shows a "Previously:" label with the old value
  Widget _buildPreviousValueLabel(String previousValue) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Previously:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey[500])),
          const SizedBox(height: 4),
          Text(
            previousValue,
            style: TextStyle(fontSize: 12, color: Colors.grey[500], fontStyle: FontStyle.italic, decoration: TextDecoration.lineThrough),
          ),
        ],
      ),
    );
  }

  String _formatPlaceType(String type) {
    switch (type) {
      case 'private_land': return 'Private Land';
      case 'campsite': return 'Campsite';
      case 'farm': return 'Farm';
      case 'pub': return 'Pub';
      case 'car_park': return 'Car Park';
      case 'driveway': return 'Driveway';
      default: return type.replaceAll('_', ' ');
    }
  }

  IconData _getAmenityIcon(String amenity) {
    final lower = amenity.toLowerCase();
    if (lower.contains('wifi') || lower.contains('internet')) return Icons.wifi;
    if (lower.contains('electric') || lower.contains('power')) return Icons.bolt;
    if (lower.contains('water')) return Icons.water_drop;
    if (lower.contains('toilet') || lower.contains('wc')) return Icons.wc;
    if (lower.contains('shower')) return Icons.shower;
    if (lower.contains('waste') || lower.contains('disposal')) return Icons.delete;
    if (lower.contains('laundry')) return Icons.local_laundry_service;
    if (lower.contains('pet') || lower.contains('dog')) return Icons.pets;
    if (lower.contains('bbq') || lower.contains('grill')) return Icons.outdoor_grill;
    if (lower.contains('fire') || lower.contains('campfire')) return Icons.local_fire_department;
    if (lower.contains('park')) return Icons.local_parking;
    if (lower.contains('shop') || lower.contains('store')) return Icons.store;
    return Icons.check_circle;
  }
}
