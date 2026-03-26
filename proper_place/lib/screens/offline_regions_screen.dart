import 'package:flutter/material.dart';
import '../services/offline_service.dart';

class OfflineRegionsScreen extends StatefulWidget {
  const OfflineRegionsScreen({super.key});

  @override
  State<OfflineRegionsScreen> createState() => _OfflineRegionsScreenState();
}

class _OfflineRegionsScreenState extends State<OfflineRegionsScreen> {
  static const Color darkBlue = Color(0xFF3A6DB5);

  Set<String> _downloadedRegions = {};
  Map<String, DateTime> _lastSynced = {};
  String? _currentlyDownloading;
  double _downloadProgress = 0;
  String _downloadStatus = '';
  int _totalCacheSize = 0;

  @override
  void initState() {
    super.initState();
    _loadState();
  }

  Future<void> _loadState() async {
    final downloaded = await OfflineService.getDownloadedRegions();
    final synced = <String, DateTime>{};
    for (var id in downloaded) {
      final dt = await OfflineService.getLastSync(id);
      if (dt != null) synced[id] = dt;
    }
    final cacheSize = await OfflineService.getCacheSize();
    setState(() {
      _downloadedRegions = downloaded.toSet();
      _lastSynced = synced;
      _totalCacheSize = cacheSize;
    });
  }

  Future<void> _downloadRegion(String regionId) async {
    setState(() {
      _currentlyDownloading = regionId;
      _downloadProgress = 0;
      _downloadStatus = 'Starting...';
    });

    try {
      await OfflineService.downloadRegion(
        regionId,
        onProgress: (status, progress) {
          if (mounted) {
            setState(() {
              _downloadStatus = status;
              _downloadProgress = progress;
            });
          }
        },
      );
      await _loadState();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Download failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _currentlyDownloading = null;
        });
      }
    }
  }

  Future<void> _removeRegion(String regionId) async {
    final region = OfflineService.ukRegions.firstWhere((r) => r.id == regionId);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Download'),
        content: Text('Remove offline data for ${region.name}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await OfflineService.removeRegion(regionId);
      await _loadState();
    }
  }

  Future<void> _syncAll() async {
    if (_downloadedRegions.isEmpty) return;
    final online = await OfflineService.isOnline();
    if (!online) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No internet connection'), backgroundColor: Colors.orange),
        );
      }
      return;
    }

    setState(() {
      _currentlyDownloading = '__syncing__';
      _downloadStatus = 'Syncing...';
      _downloadProgress = 0;
    });

    try {
      await OfflineService.syncDownloadedRegions(
        onProgress: (name, progress) {
          if (mounted) {
            setState(() {
              _downloadStatus = 'Syncing $name...';
              _downloadProgress = progress;
            });
          }
        },
      );
      await _loadState();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('All regions synced!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sync failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _currentlyDownloading = null);
    }
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Offline Regions', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          if (_downloadedRegions.isNotEmpty && _currentlyDownloading == null)
            IconButton(
              icon: const Icon(Icons.sync, color: darkBlue),
              tooltip: 'Sync all regions',
              onPressed: _syncAll,
            ),
        ],
      ),
      body: Column(
        children: [
          // Info bar
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: darkBlue.withValues(alpha: 0.08),
            child: Row(
              children: [
                const Icon(Icons.info_outline, size: 18, color: darkBlue),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Download regions to browse sites offline. '
                    'Data syncs automatically when you\'re back online.',
                    style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                  ),
                ),
              ],
            ),
          ),
          if (_totalCacheSize > 0)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.grey[100],
              child: Text(
                'Total cached: ${OfflineService.formatBytes(_totalCacheSize)}  •  '
                '${_downloadedRegions.length} region${_downloadedRegions.length == 1 ? '' : 's'}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ),
          // Global progress bar
          if (_currentlyDownloading != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_downloadStatus, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _downloadProgress,
                      backgroundColor: Colors.grey[200],
                      color: darkBlue,
                      minHeight: 6,
                    ),
                  ),
                ],
              ),
            ),
          // Region list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: OfflineService.ukRegions.length,
              itemBuilder: (context, index) {
                final region = OfflineService.ukRegions[index];
                final isDownloaded = _downloadedRegions.contains(region.id);
                final isDownloading = _currentlyDownloading == region.id;
                final lastSync = _lastSynced[region.id];

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDownloaded ? darkBlue.withValues(alpha: 0.3) : Colors.grey[200]!,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: isDownloaded ? darkBlue.withValues(alpha: 0.1) : Colors.grey[100],
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        isDownloaded ? Icons.cloud_done : Icons.cloud_download_outlined,
                        color: isDownloaded ? darkBlue : Colors.grey[400],
                        size: 24,
                      ),
                    ),
                    title: Text(
                      region.name,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: isDownloaded ? darkBlue : Colors.black87,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 2),
                        Text(
                          region.description,
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        if (isDownloaded && lastSync != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Synced ${_timeAgo(lastSync)}',
                            style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                          ),
                        ],
                      ],
                    ),
                    trailing: isDownloading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2, color: darkBlue),
                          )
                        : _currentlyDownloading != null
                            ? null // Disable actions while another download is active
                            : isDownloaded
                                ? PopupMenuButton<String>(
                                    icon: const Icon(Icons.more_vert, color: Colors.grey),
                                    onSelected: (action) {
                                      if (action == 'refresh') _downloadRegion(region.id);
                                      if (action == 'remove') _removeRegion(region.id);
                                    },
                                    itemBuilder: (ctx) => [
                                      const PopupMenuItem(value: 'refresh', child: Text('Re-download')),
                                      const PopupMenuItem(
                                        value: 'remove',
                                        child: Text('Remove', style: TextStyle(color: Colors.red)),
                                      ),
                                    ],
                                  )
                                : IconButton(
                                    icon: const Icon(Icons.download_rounded, color: darkBlue),
                                    onPressed: () => _downloadRegion(region.id),
                                  ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
