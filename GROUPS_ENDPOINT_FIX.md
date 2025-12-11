# Groups Endpoint Fix - ID Mismatch Resolution

## Problem
Groups were created successfully in the database but didn't appear in the Flutter UI when users navigated to "Mis Grupos" screen.

**Root Cause:** 
- Flutter was using `User.id` (c2f5ba53-d337-48b7-97e7-34726c5adf0b) from JWT token
- Backend expected `Member.id` (different format, database-assigned)
- These are TWO DIFFERENT IDs causing the mismatch

## Solution

### Backend Changes (NestJS)

#### 1. Fixed Groups Controller Route (`groups.controller.ts`)
```typescript
// BEFORE
@Controller('api/groups')

// AFTER
@Controller('groups')
```
**Reason:** The app has a global prefix `api` set in `main.ts`, so the controller shouldn't include it.

#### 2. New Endpoint: `/api/groups/my-groups` 
```typescript
@Get('my-groups')
async getMyGroups(@Request() req) {
  try {
    const userId = req.user?.sub || req.user?.id;  // Extract from JWT
    if (!userId) throw new BadRequestException('No authenticated user');
    
    const groups = await this.groupsService.getGroupsByUserId(userId);
    return { success: true, data: groups };
  } catch (error) {
    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  }
}
```
- Extracts `userId` from JWT token (req.user)
- Converts User.id → Member.id automatically
- Returns groups where user is responsible OR companion (no restrictions)

#### 3. New Service Method: `getGroupsByUserId()` in `groups.service.ts`
```typescript
async getGroupsByUserId(userId: string) {
  const member = await this.memberRepository.findOne({ 
    where: { userId } 
  });
  if (!member) return [];
  return this.getGroupsByMemberId(member.id);
}
```
- Finds the Member record by userId
- Delegates to existing `getGroupsByMemberId()` method
- Encapsulates the User→Member ID conversion

### Flutter Changes

#### 1. New Service Method: `getMyGroups()` in `group_service.dart`
```dart
Future<List<Group>> getMyGroups() async {
  final response = await apiClient.dio.get('/api/groups/my-groups');
  
  // Parse response handling both List and Map formats
  List<dynamic> data = [];
  if (response.data is List) {
    data = response.data as List<dynamic>;
  } else if (response.data is Map) {
    final map = response.data as Map<dynamic, dynamic>;
    if (map['data'] != null && map['data'] is List) {
      data = map['data'] as List<dynamic>;
    }
  }
  
  return data.map((g) => Group.fromJson(g as Map<String, dynamic>)).toList();
}
```
- Calls new backend endpoint (no memberId parameter needed)
- Uses JWT authentication automatically
- Handles response format variations

#### 2. Updated `my_groups_screen.dart`
```dart
Future<void> _loadGroups() async {
  final groupService = ref.read(groupServiceProvider);
  final groups = await groupService.getMyGroups();  // Use new method
  // No more memberId extraction or type confusion
}
```
- Removed manual `auth.id` usage
- Now calls `getMyGroups()` which handles everything via JWT

## Query Structure

The query now correctly combines groups from TWO sources:

```sql
-- Groups where user is RESPONSIBLE
SELECT * FROM groups WHERE responsibleMemberId = :memberId

-- Groups where user is COMPANION
SELECT groups.* FROM groups 
INNER JOIN group_companions ON group_companions.groupId = groups.id 
WHERE group_companions.memberId = :memberId
```

**Verification:** Query is NOT user-restricted, returns ALL groups associated with the member.

## Testing Checklist

- [ ] Backend compiles without errors
- [ ] Endpoint `/api/groups/my-groups` responds with correct User→Member ID conversion
- [ ] Flutter compiles without errors
- [ ] Assign group membership to a user
- [ ] Navigate to "Mis Grupos" screen
- [ ] Verify group appears in the list
- [ ] Verify group shows correct number of companions
- [ ] Verify both "Responsible" and "Companion" relationships work

## Files Modified

**Backend:**
- `/Users/hectortaveras/develop/gym/gym-backend/src/modules/groups/groups.controller.ts` (Route fix, new endpoint)
- `/Users/hectortaveras/develop/gym/gym-backend/src/modules/groups/groups.service.ts` (New method)

**Frontend:**
- `/Users/hectortaveras/develop/gym/sggi/lib/services/group_service.dart` (New method)
- `/Users/hectortaveras/develop/gym/sggi/lib/screens/groups/my_groups_screen.dart` (Updated to use new method)

## Related Files (No Changes)

- Member-Memberships auto-group creation already works ✅
- Group CRUD operations already work ✅
- Database schema already correct ✅
