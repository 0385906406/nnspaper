# Admin Panel Guide

## 🚀 Quick Start

### 1. Seed Database
```bash
curl -X POST http://localhost:3000/api/admin/init-seed
```

### 2. Login
- URL: `http://localhost:3000/admin/login`
- Username: `admin`
- Password: `admin`

---

## 📐 UI Components Library

Located in `src/components/admin/ui/`

### Import & Usage

```typescript
import {
  Button,
  Input,
  Card,
  Select,
  Textarea,
  Form,
  FormGroup,
  FormActions,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/admin/ui";
```

### Components

#### Button
```tsx
<Button variant="primary" size="md" isLoading={false}>
  Click me
</Button>

// Variants: primary | secondary | danger | ghost
// Sizes: sm | md | lg
```

#### Input
```tsx
<Input
  label="Email"
  type="email"
  placeholder="user@example.com"
  error={errors.email}
  helperText="Optional hint text"
  required
/>
```

#### Card
```tsx
<Card header={<h3>Title</h3>} footer={<Button>Save</Button>}>
  Content here
</Card>
```

#### Form
```tsx
<Form onSubmit={handleSubmit}>
  <FormGroup>
    <Input label="Name" />
    <Input label="Email" />
  </FormGroup>
  <FormActions>
    <Button variant="ghost">Cancel</Button>
    <Button variant="primary" type="submit">Save</Button>
  </FormActions>
</Form>
```

#### Table
```tsx
<Table>
  <TableHeader>
    <TableRow isHeader>
      <TableCell isHeader>Name</TableCell>
      <TableCell isHeader align="right">Actions</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
      <TableCell align="right">
        <Button variant="ghost" size="sm">Edit</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### PageHeader
```tsx
import { PageHeader } from "@/components/admin/page-header";

<PageHeader
  title="Users"
  description="Manage user accounts"
  action={{ label: "+ Create", href: "/admin/users/create" }}
/>
```

---

## 🎨 Color & Styling

### CSS Variables (from globals.css)
- `--accent`: Green (#22c55e)
- `--foreground`: Light text (#f3f3f6)
- `--muted`: Muted text (#9a9aa6)
- `--border`: Borders (#2a2a32)
- `--surface`: Card background (#17171c)
- `--surface-2`: Hover background (#1f1f26)

### Spacing Convention
- Gap: 1.5 (6px), 3 (12px), 6 (24px)
- Padding: 2 (8px), 3 (12px), 4 (16px), 6 (24px)
- Rounded: lg (8px), xl (12px)

---

## 📄 Admin Pages Structure

### Create/Edit Pages Template

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Form,
  FormGroup,
  FormActions,
  Card,
} from "@/components/admin/ui";
import { PageHeader } from "@/components/admin/page-header";

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ /* ... */ });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // ... API call
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create Item" description="Add new item" />
      <Card>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            {/* Inputs here */}
          </FormGroup>
          <FormActions>
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={loading}>Create</Button>
          </FormActions>
        </Form>
      </Card>
    </div>
  );
}
```

---

## 🔒 Permissions

### Default Roles
1. **Admin**: All permissions (27 total)
2. **Editor**: Create/Edit wallpapers, Approve
3. **Viewer**: Read-only access

### Available Permissions
- `user.*`: user.view, user.create, user.edit, user.delete
- `category.*`: category.view, category.create, category.edit, category.delete
- `wallpaper.*`: wallpaper.view, wallpaper.create, wallpaper.edit, wallpaper.delete, wallpaper.approve
- `setting.*`: setting.view, setting.edit
- `role.*`: role.view, role.create, role.edit, role.delete

---

## 📊 API Endpoints

### Users
```
GET    /api/admin/users                    # List
POST   /api/admin/users                    # Create
GET    /api/admin/users/[id]               # Get one
PUT    /api/admin/users/[id]               # Update
DELETE /api/admin/users/[id]               # Delete
```

### Categories
```
GET    /api/admin/categories               # List
POST   /api/admin/categories               # Create
GET    /api/admin/categories/[id]          # Get one
PUT    /api/admin/categories/[id]          # Update
DELETE /api/admin/categories/[id]          # Delete
```

### Wallpapers
```
GET    /api/admin/wallpapers               # List
POST   /api/admin/wallpapers               # Create
GET    /api/admin/wallpapers/[id]          # Get one
PUT    /api/admin/wallpapers/[id]          # Update
DELETE /api/admin/wallpapers/[id]          # Delete
```

### Settings
```
GET    /api/admin/settings                 # List all
PUT    /api/admin/settings                 # Update one
```

---

## 🎯 Next Features to Build

1. **File Upload** - Cloudinary/AWS S3 integration
2. **User Edit/Delete** - `/admin/users/[id]` pages
3. **Category Edit** - `/admin/categories/[id]` page
4. **Wallpaper Edit/Approve** - `/admin/wallpapers/[id]` page
5. **Bulk Actions** - Select multiple items
6. **Search & Filter** - Advanced filtering
7. **Email Notifications** - Send on wallpaper approval
8. **User Analytics** - Dashboard stats
9. **Export/Backup** - Data export

---

## 💡 Tips

- Always wrap forms in `<Form>` and use `<FormGroup>` for inputs
- Use `PageHeader` for consistent page titles
- Use `Card` to group related content
- Use `Table` for list views
- Use `Button` variants: primary (actions), secondary (navigate), danger (delete), ghost (cancel)
- Keep colors consistent with CSS variables
- Test responsiveness on mobile (admin can be used on tablet)
