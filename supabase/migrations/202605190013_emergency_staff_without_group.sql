alter table public.staff_assignments
  alter column main_group drop not null;

alter table public.staff_assignments
  drop constraint if exists staff_assignments_main_group_check;

alter table public.staff_assignments
  add constraint staff_assignments_main_group_check
  check (main_group is null or main_group in ('Red', 'Blue', 'Yellow', 'Green', 'Pink', 'Purple', 'Orange'));

alter table public.staff_assignments
  drop constraint if exists staff_assignments_role_scope_check;

alter table public.staff_assignments
  add constraint staff_assignments_role_scope_check
  check (
    (role = 'emergency_staff' and main_group is null and subgroup is null)
    or
    (role in ('staff', 'mentor', 'viewer') and main_group is not null)
  );

drop index if exists staff_assignments_one_global_emergency_staff;
create unique index staff_assignments_one_global_emergency_staff
on public.staff_assignments (user_id)
where role = 'emergency_staff';

update public.staff_assignments
set main_group = null,
    subgroup = null
where role = 'emergency_staff';
