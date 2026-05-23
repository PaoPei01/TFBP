# Production Readiness Checklist

ใช้ checklist นี้ก่อนเปิดรับสมัครจริงของ `parent-orientation-staff-2569` และก่อนใช้งานระบบกับข้อมูลนักศึกษาจริง

## GitHub Actions Deploy

- [ ] ตรวจว่า workflow `Deploy GitHub Pages` ผ่านบน branch `main`
- [ ] ตรวจว่า build ใช้ `VITE_GIT_COMMIT_SHA`, `VITE_BUILD_TIME`, และ `VITE_APP_VERSION`
- [ ] เปิดหน้าเว็บหลัง deploy แล้วดู build info ใน `/admin/system-readiness`
- [ ] ตรวจว่าไม่มี secret หรือ `service_role` key ใน frontend/env ของ GitHub Pages

## Supabase Migration Check

- [ ] สำรองฐานข้อมูลก่อนรัน migration
- [ ] รัน migration ล่าสุดบน staging ก่อน production
- [ ] ยืนยันว่ามี migration `202605230018_parent_orientation_production_hardening.sql`
- [ ] เปิด `/admin/system-readiness`
- [ ] Supabase Schema แสดง `ผ่าน`
- [ ] Required RPC Functions แสดง `ผ่าน`
- [ ] RLS / Security ไม่มีตารางสำคัญที่ยังไม่เปิด RLS

## SQL Verification

รันหรือตรวจผ่านหน้า `/admin/system-readiness`:

- [ ] `events` มี `parent-orientation-staff-2569`
- [ ] `people` พร้อมใช้งาน
- [ ] `staff_applications` มี identity และ assignment columns
- [ ] `event_staff_duty_quotas` มี duty quotas ครบ
- [ ] `get_system_readiness_report()` ทำงานสำหรับแอดมิน
- [ ] `submit_event_staff_application()` ใช้ `pg_advisory_xact_lock`
- [ ] `log_staff_application_export()` บันทึก export audit log ได้

## Parent Orientation Quota Verification

- [ ] Duty quota รวมเท่ากับ 130
- [ ] มี 8 ฝ่าย: traffic, medical, registration, welfare, benefits_sales, registration_it, backstage, general
- [ ] ฝ่ายที่เต็มแสดง `รับเต็มจำนวนแล้ว`
- [ ] หากฝ่ายที่เลือกเต็ม ระบบ fallback ไป `general` ถ้ายังมีโควต้า
- [ ] หากทุกฝ่ายเต็ม ใบสมัครยังส่งได้ แต่ assignment เป็น `pending`
- [ ] Admin override ที่เกินโควต้ามี warning ชัดเจน

## Test Application Cases

- [ ] Student ID + CMU Mail ตรงฐานข้อมูล = `verified`
- [ ] Student ID ตรง แต่ CMU Mail ไม่ตรง = `email_mismatch` และสมัครต่อได้
- [ ] Student ID ไม่พบ = `not_found` / pending review และสมัครต่อได้
- [ ] Gmail/Hotmail/personal email ถูกปฏิเสธ
- [ ] Duty ที่เต็มไม่สามารถเลือกจาก public form
- [ ] Duty เต็มระหว่าง submit ไม่ทำให้ assignment เกินโควต้า
- [ ] All-full state ไม่ทำให้ submit ล้มเหลว
- [ ] Success screen แสดง `ฝ่ายที่ระบบจัดให้เบื้องต้น` และข้อความให้แคปหน้าจอ

## Admin Review And Export

- [ ] `/admin/events/:eventId/applications` โหลดได้
- [ ] Quota dashboard แสดง total quota, assigned, remaining, full, over quota
- [ ] คลิก duty summary แล้ว filter ตามฝ่ายได้
- [ ] Admin ปรับฝ่ายเบื้องต้นได้
- [ ] Export Excel ทั้งหมดได้
- [ ] Export Excel ตาม filter ได้
- [ ] Export Excel รายฝ่ายได้
- [ ] Export modal บังคับ checkbox ยืนยันการใช้ข้อมูลเพื่อกิจกรรม
- [ ] Export สร้าง `change_logs.action = export_staff_applications_excel`
- [ ] Log ไม่เก็บข้อมูลผู้สมัครรายคนหรือไฟล์ export

## Privacy Checklist

- [ ] Public event pages ไม่แสดงเบอร์ อีเมล health data หรือ emergency contact
- [ ] Public status/lookup ไม่แสดง email/phone เดิมแบบเต็ม
- [ ] Health/limitation data แสดงเฉพาะฟอร์มสมัครและ admin review/export
- [ ] Excel ใช้เฉพาะเพื่อดำเนินงานกิจกรรม และไม่ส่งต่อสาธารณะ
- [ ] Admin route ทั้งหมดอยู่หลัง `AdminGuard`

## Supabase Dashboard Checklist

- [ ] ตรวจ API usage
- [ ] ตรวจ Database size
- [ ] ตรวจ Auth MAU
- [ ] ตรวจ Logs หลังเปิดรับสมัคร
- [ ] ตรวจ Storage usage
- [ ] ตรวจ Backup/restore readiness
- [ ] Free plan อาจพอสำหรับ pilot 130 คน แต่ Pro plan แนะนำสำหรับ production ที่มีข้อมูลส่วนบุคคลนักศึกษา

## Rollback Notes

- [ ] หาก migration ล่าสุดมีปัญหา ให้ปิดรับสมัครชั่วคราวด้วย event status ก่อน
- [ ] เก็บ SQL rollback/manual patch สำหรับ RPC ล่าสุด
- [ ] อย่าลบ `staff_applications` หรือ `people`
- [ ] Export รายชื่อสำรองหลังปิดรับสมัครทุกวัน
