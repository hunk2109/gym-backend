# Guía de Sincronización desde Flutter

## Flujo Completo

### Paso 1: Seleccionar Ruta de Base de Datos Access

Primero, el usuario debe seleccionar la ruta de la base de datos Access mediante un file picker.

```dart
// En tu widget de Flutter
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class SyncSetupScreen extends StatefulWidget {
  @override
  State<SyncSetupScreen> createState() => _SyncSetupScreenState();
}

class _SyncSetupScreenState extends State<SyncSetupScreen> {
  String? selectedAccessDbPath;
  bool isLoading = false;
  String? errorMessage;
  String? successMessage;

  Future<void> pickAccessDatabase() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['mdb', 'accdb'],
      dialogTitle: 'Selecciona la base de datos Access',
    );

    if (result != null) {
      setState(() {
        selectedAccessDbPath = result.files.single.path;
      });
    }
  }

  Future<void> setAccessPath() async {
    if (selectedAccessDbPath == null) {
      setState(() => errorMessage = 'Por favor selecciona una base de datos');
      return;
    }

    setState(() => isLoading = true);

    try {
      final response = await http.put(
        Uri.parse('http://localhost:3000/api/sync/access-path'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'path': selectedAccessDbPath}),
      );

      if (response.statusCode == 200) {
        setState(() {
          successMessage = 'Ruta de Access establecida correctamente';
          errorMessage = null;
        });
      } else {
        setState(() => errorMessage = 'Error estableciendo la ruta');
      }
    } catch (e) {
      setState(() => errorMessage = 'Error de conexión: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Configurar Sincronización')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            // Mostrar ruta seleccionada
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                selectedAccessDbPath ?? 'No seleccionada',
                style: TextStyle(fontSize: 12),
              ),
            ),
            SizedBox(height: 16),

            // Botón para seleccionar archivo
            ElevatedButton.icon(
              onPressed: pickAccessDatabase,
              icon: Icon(Icons.folder_open),
              label: Text('Seleccionar Base de Datos Access'),
            ),
            SizedBox(height: 16),

            // Botón para establecer ruta
            ElevatedButton.icon(
              onPressed: isLoading ? null : setAccessPath,
              icon: Icon(Icons.save),
              label: isLoading
                  ? CircularProgressIndicator()
                  : Text('Establecer Ruta'),
            ),
            SizedBox(height: 16),

            // Mensajes
            if (errorMessage != null)
              Text(
                errorMessage!,
                style: TextStyle(color: Colors.red),
              ),
            if (successMessage != null)
              Text(
                successMessage!,
                style: TextStyle(color: Colors.green),
              ),
          ],
        ),
      ),
    );
  }
}
```

### Paso 2: Realizar Sincronización Inicial

Una vez establecida la ruta, ejecutar la sincronización inicial:

```dart
class SyncController {
  static const String baseUrl = 'http://localhost:3000/api/sync';

  Future<SyncResult> performInitialSync() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/initial'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return SyncResult.fromJson(data);
      } else {
        throw Exception('Error en sincronización inicial');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  Future<void> enableAutoSync() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/enable-auto'),
      );

      if (response.statusCode != 200) {
        throw Exception('Error habilitando auto-sync');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  Future<void> disableAutoSync() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/disable-auto'),
      );

      if (response.statusCode != 200) {
        throw Exception('Error deshabilitando auto-sync');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  Future<SyncStatus> getSyncStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/status'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return SyncStatus.fromJson(data);
      } else {
        throw Exception('Error obteniendo estado');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }
}

class SyncResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? data;

  SyncResult({
    required this.success,
    required this.message,
    this.data,
  });

  factory SyncResult.fromJson(Map<String, dynamic> json) {
    return SyncResult(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      data: json['data'],
    );
  }
}

class SyncStatus {
  final bool isEnabled;
  final DateTime? lastSyncTime;
  final String interval;

  SyncStatus({
    required this.isEnabled,
    this.lastSyncTime,
    required this.interval,
  });

  factory SyncStatus.fromJson(Map<String, dynamic> json) {
    return SyncStatus(
      isEnabled: json['isEnabled'] ?? false,
      lastSyncTime: json['lastSyncTime'] != null
          ? DateTime.parse(json['lastSyncTime'])
          : null,
      interval: json['interval'] ?? '',
    );
  }
}
```

### Paso 3: Pantalla de Control de Sincronización

```dart
class SyncControlScreen extends StatefulWidget {
  @override
  State<SyncControlScreen> createState() => _SyncControlScreenState();
}

class _SyncControlScreenState extends State<SyncControlScreen> {
  final SyncController _syncController = SyncController();
  SyncStatus? _syncStatus;
  bool _isLoading = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _checkSyncStatus();
  }

  Future<void> _checkSyncStatus() async {
    try {
      final status = await _syncController.getSyncStatus();
      setState(() => _syncStatus = status);
    } catch (e) {
      setState(() => _message = e.toString());
    }
  }

  Future<void> _performSync() async {
    setState(() => _isLoading = true);

    try {
      final result = await _syncController.performInitialSync();
      setState(() {
        _message = result.message;
        if (result.success) {
          _checkSyncStatus();
        }
      });
    } catch (e) {
      setState(() => _message = 'Error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleAutoSync() async {
    setState(() => _isLoading = true);

    try {
      if (_syncStatus?.isEnabled ?? false) {
        await _syncController.disableAutoSync();
      } else {
        await _syncController.enableAutoSync();
      }
      _checkSyncStatus();
    } catch (e) {
      setState(() => _message = 'Error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Control de Sincronización')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: ListView(
          children: [
            // Estado actual
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Auto-Sync: ${_syncStatus?.isEnabled ?? false ? "Habilitado ✓" : "Deshabilitado ✗"}',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Última sincronización: ${_syncStatus?.lastSyncTime ?? "Nunca"}',
                      style: TextStyle(fontSize: 14),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Intervalo: ${_syncStatus?.interval ?? "N/A"}',
                      style: TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16),

            // Botones de control
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _performSync,
              icon: Icon(Icons.sync),
              label: _isLoading
                  ? SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text('Sincronizar Ahora'),
            ),
            SizedBox(height: 8),

            ElevatedButton.icon(
              onPressed: _isLoading ? null : _toggleAutoSync,
              icon: Icon(Icons.settings),
              label: Text(
                _syncStatus?.isEnabled ?? false
                    ? 'Deshabilitar Auto-Sync'
                    : 'Habilitar Auto-Sync',
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: (_syncStatus?.isEnabled ?? false)
                    ? Colors.orange
                    : Colors.green,
              ),
            ),
            SizedBox(height: 16),

            // Mensaje
            if (_message != null)
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _message!.startsWith('Error') ? Colors.red : Colors.green,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _message!,
                  style: TextStyle(color: Colors.white),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Flujo Recomendado en la App

1. **Primera vez que abre la app**:
   - Mostrar pantalla de selección de base de datos
   - Usuario selecciona el archivo `.mdb`
   - Guardar la ruta en `SharedPreferences`
   - Ejecutar sincronización inicial

2. **Después de la sincronización inicial**:
   - Mostrar opción para habilitar auto-sync
   - Auto-sync se ejecuta cada 5 minutos automáticamente

3. **En el menú principal**:
   - Botón para ver estado de sincronización
   - Botón para forzar sincronización manual
   - Botón para cambiar ruta de base de datos

## Notas Importantes

⚠️ **IMPORTANTE**: La ruta DEBE ser establecida ANTES de cualquier sincronización.

✓ Los endpoints esperan estas acciones en orden:
1. `PUT /api/sync/access-path` - Establecer ruta
2. `POST /api/sync/initial` - Sincronizar inicial
3. `POST /api/sync/enable-auto` - Habilitar auto-sync (opcional)

❌ Si intenta sincronizar sin establecer ruta primero, obtendrá error:
```json
{
  "success": false,
  "error": "Ruta de la base de datos Access no establecida. Use PUT /api/sync/access-path primero."
}
```
