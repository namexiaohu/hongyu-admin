const PAIR_SEP = '|||';

export function serializePairRows(rows: Array<{ label: string; value: string }>): string {
  return rows
    .filter((row) => row.label?.trim() || row.value?.trim())
    .map((row) => `${row.label ?? ''}${PAIR_SEP}${row.value ?? ''}`)
    .join('\n');
}

export function deserializePairRows(text: string): Array<{ label: string; value: string }> {
  if (!text.trim()) return [];
  return text.split('\n').map((line) => {
    const [label = '', value = ''] = line.split(PAIR_SEP);
    return { label: label.trim(), value: value.trim() };
  }).filter((row) => row.label || row.value);
}

export function serializeLineList(items: string[]): string {
  return items.map((item) => item.trim()).filter(Boolean).join('\n');
}

export function deserializeLineList(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function serializeTeamMembers(rows: Array<{ title: string; name: string }>): string {
  return rows
    .filter((row) => row.title?.trim() || row.name?.trim())
    .map((row) => `${row.title ?? ''}${PAIR_SEP}${row.name ?? ''}`)
    .join('\n');
}

export function deserializeTeamMembers(text: string): Array<{ title: string; name: string }> {
  if (!text.trim()) return [];
  return text.split('\n').map((line) => {
    const [title = '', name = ''] = line.split(PAIR_SEP);
    return { title: title.trim(), name: name.trim() };
  }).filter((row) => row.title || row.name);
}

export type FeaturedPostTranslateSource = {
  coverImage: string;
  badgeText: string;
  title: string;
  description: string;
  url: string;
};

export function serializeFeaturedPosts(posts: FeaturedPostTranslateSource[]): string {
  return posts
    .filter((post) => post.badgeText?.trim() || post.title?.trim() || post.description?.trim())
    .map((post) => `${post.badgeText ?? ''}${PAIR_SEP}${post.title ?? ''}${PAIR_SEP}${post.description ?? ''}`)
    .join('\n');
}

export function deserializeFeaturedPosts(
  text: string,
  sourcePosts: FeaturedPostTranslateSource[],
): FeaturedPostTranslateSource[] {
  if (!text.trim()) {
    return sourcePosts.map((post) => ({
      coverImage: post.coverImage ?? '',
      url: post.url ?? '',
      badgeText: post.badgeText ?? '',
      title: post.title ?? '',
      description: post.description ?? '',
    }));
  }
  return text.split('\n').map((line, index) => {
    const [badgeText = '', title = '', description = ''] = line.split(PAIR_SEP);
    const source = sourcePosts[index];
    return {
      coverImage: source?.coverImage ?? '',
      url: source?.url ?? '',
      badgeText: badgeText.trim(),
      title: title.trim(),
      description: description.trim(),
    };
  }).filter((post) => post.badgeText || post.title || post.description || post.coverImage || post.url);
}

export type OfficeTranslateSource = {
  coverImage: string;
  name: string;
  location: string;
  phone: string;
  contactPerson: string;
  email: string;
};

export function serializeOffices(offices: OfficeTranslateSource[]): string {
  return offices
    .filter((office) => office.name?.trim() || office.location?.trim() || office.phone?.trim() || office.contactPerson?.trim() || office.email?.trim())
    .map((office) => [
      office.name ?? '',
      office.location ?? '',
      office.phone ?? '',
      office.contactPerson ?? '',
      office.email ?? '',
    ].join(PAIR_SEP))
    .join('\n');
}

export function deserializeOffices(text: string, sourceOffices: OfficeTranslateSource[]): OfficeTranslateSource[] {
  if (!text.trim()) {
    return sourceOffices.map((office) => ({
      coverImage: office.coverImage ?? '',
      name: office.name ?? '',
      location: office.location ?? '',
      phone: office.phone ?? '',
      contactPerson: office.contactPerson ?? '',
      email: office.email ?? '',
    }));
  }
  return text.split('\n').map((line, index) => {
    const [name = '', location = '', phone = '', contactPerson = '', email = ''] = line.split(PAIR_SEP);
    const source = sourceOffices[index];
    return {
      coverImage: source?.coverImage ?? '',
      name: name.trim(),
      location: location.trim(),
      phone: phone.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
    };
  }).filter((office) => office.name || office.location || office.phone || office.contactPerson || office.email || office.coverImage);
}

export type SpeakerTranslateSource = {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  expertise: string;
  region?: string;
  badgeText?: string;
  description?: string;
};

export function serializeSpeakers(speakers: SpeakerTranslateSource[]): string {
  return speakers
    .filter((speaker) => speaker.name?.trim() || speaker.bio?.trim() || speaker.expertise?.trim() || speaker.region?.trim())
    .map((speaker) => [
      speaker.name ?? '',
      speaker.region ?? '',
      speaker.bio ?? '',
      speaker.badgeText ?? '',
      speaker.expertise ?? '',
    ].join(PAIR_SEP))
    .join('\n');
}

export function deserializeSpeakers(text: string, sourceSpeakers: SpeakerTranslateSource[]): SpeakerTranslateSource[] {
  if (!text.trim()) {
    return sourceSpeakers.map((speaker) => ({
      id: speaker.id,
      avatar: speaker.avatar ?? '',
      name: speaker.name ?? '',
      bio: speaker.bio ?? '',
      expertise: speaker.expertise ?? '',
      region: speaker.region ?? '',
      badgeText: speaker.badgeText ?? '',
      description: speaker.description ?? '',
    }));
  }
  return text.split('\n').map((line, index) => {
    const [name = '', region = '', bio = '', badgeText = '', expertise = ''] = line.split(PAIR_SEP);
    const source = sourceSpeakers[index];
    return {
      id: source?.id ?? crypto.randomUUID(),
      avatar: source?.avatar ?? '',
      name: name.trim(),
      region: region.trim(),
      bio: bio.trim(),
      badgeText: badgeText.trim(),
      expertise: expertise.trim(),
      description: source?.description ?? '',
    };
  }).filter((speaker) => speaker.name || speaker.bio || speaker.expertise || speaker.region || speaker.avatar);
}

export type SponsorTranslateSource = {
  id: string;
  tier: 'diamond' | 'gold' | 'silver';
  name: string;
  logo: string;
  badgeText: string;
  intro: string;
};

export function serializeSponsors(sponsors: SponsorTranslateSource[]): string {
  return sponsors
    .filter((sponsor) => sponsor.name?.trim() || sponsor.intro?.trim() || sponsor.badgeText?.trim())
    .map((sponsor) => `${sponsor.name ?? ''}${PAIR_SEP}${sponsor.badgeText ?? ''}${PAIR_SEP}${sponsor.intro ?? ''}`)
    .join('\n');
}

export function deserializeSponsors(text: string, sourceSponsors: SponsorTranslateSource[]): SponsorTranslateSource[] {
  if (!text.trim()) {
    return sourceSponsors.map((sponsor) => ({
      id: sponsor.id,
      tier: sponsor.tier ?? 'gold',
      logo: sponsor.logo ?? '',
      name: sponsor.name ?? '',
      badgeText: sponsor.badgeText ?? '',
      intro: sponsor.intro ?? '',
    }));
  }
  return text.split('\n').map((line, index) => {
    const [name = '', badgeText = '', intro = ''] = line.split(PAIR_SEP);
    const source = sourceSponsors[index];
    return {
      id: source?.id ?? crypto.randomUUID(),
      tier: source?.tier ?? 'gold',
      logo: source?.logo ?? '',
      name: name.trim(),
      badgeText: badgeText.trim(),
      intro: intro.trim(),
    };
  }).filter((sponsor) => sponsor.name || sponsor.intro || sponsor.badgeText || sponsor.logo);
}
