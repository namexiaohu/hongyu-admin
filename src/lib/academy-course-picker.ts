export type AcademyCoursePickerItem = {
  id: string;
  slug: string;
  title: string;
  coverPreviewUrl: string;
  status: string;
};

export function formatAcademyCourseSelectedDisplay(item: AcademyCoursePickerItem) {
  return {
    name: item.title || item.slug,
    meta: item.slug,
  };
}
