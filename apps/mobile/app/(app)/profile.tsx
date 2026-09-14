import { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { tw } from '../../src/theme/tw';
import { Card, Button, TextField } from '../../src/components';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { useUpdateProfile } from '../../src/hooks/useUserPreferences';

export default function ProfileScreen() {
  const { user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? '');
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    await updateProfile.mutateAsync({ name, timezone });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView className={tw.screen} contentContainerClassName="px-5 pt-4 pb-10">
      <Card className="mb-5">
        <Text className={`${tw.label} mb-1`}>Email</Text>
        <Text className={tw.textPrimary}>{user?.email}</Text>
        <Text className={`${tw.textMuted} text-xs mt-1`}>Email addresses cannot be changed here.</Text>
      </Card>

      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Timezone (IANA)" value={timezone} onChangeText={setTimezone} placeholder="e.g. America/New_York" autoCapitalize="none" />

      {saved ? <Text className={`${tw.badgeSuccessText} mb-3`}>Saved!</Text> : null}
      <Button label="Save changes" onPress={onSave} loading={updateProfile.isPending} />
    </ScrollView>
  );
}
