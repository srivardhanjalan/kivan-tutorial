import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FieldLabel from '../components/FieldLabel';
import FormScreenScaffold from '../components/layouts/FormScreenScaffold';
import FormInput from '../components/FormInput';
import DescriptionField from '../components/DescriptionField';
import LifeEventField from '../components/LifeEventField';
import ImageUploadField from '../components/ImageUploadField';
import SelectableList from '../components/SelectableList';
import SelectableRow from '../components/SelectableRow';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import useFetch from '../hooks/useFetch';
import { usePendingImageUpload } from '../hooks/usePendingImageUpload';
import {
  createEvent,
  updateEvent,
  linkWishlistToEvent,
  fetchMyWishlists,
} from '../services/api';
import type { EventCreate } from '../services/api';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One form for both creating and editing an event: the passed event (if any)
 * seeds the fields and flips the title and CTA, mirroring the wishlist form.
 * Name plus an optional life event, cover, privacy, location, and date; on
 * create you can also link one wishlist you own (the event's whole point this
 * step). The save routes to POST or PUT accordingly and goes back, and My Stuff
 * refetches on focus, so the change shows on return.
 */
export default function EventFormScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'EventForm'>();
  const event = route.params?.event;
  const toast = useToast();
  const { loading: saving, run } = useAsyncAction();

  const [name, setName] = useState(event?.name ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [eventType, setEventType] = useState<string | undefined>(
    event?.event_type ?? undefined
  );
  const [isPublic, setIsPublic] = useState(event?.is_public ?? true);
  const [location, setLocation] = useState(event?.location ?? '');
  // A plain text field this step: the app carries no date-picker component yet,
  // so a date is entered as an ISO day (formatEventDate reads it defensively).
  const [eventDate, setEventDate] = useState(event?.event_date ?? '');
  const [wishlistId, setWishlistId] = useState<string | undefined>(undefined);
  const photo = usePendingImageUpload(
    'event_photo',
    'Could not upload your event image',
    event?.image_url ?? null
  );
  // The picker only shows on create; the fetch is harmless in edit mode.
  const { data: wishlists } = useFetch(fetchMyWishlists);

  const save = () => {
    if (!name.trim()) {
      toast.show('Give your event a name', { type: 'error' });
      return;
    }
    run(async () => {
      const payload: EventCreate = {
        name: name.trim(),
        is_public: isPublic,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(eventType ? { event_type: eventType } : {}),
        ...(eventDate.trim() ? { event_date: eventDate.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(photo.changedUrl ? { image_url: photo.changedUrl } : {}),
      };
      if (event) {
        await updateEvent(event.id, payload);
      } else {
        const created = await createEvent(payload);
        if (wishlistId) {
          await linkWishlistToEvent(created.id, wishlistId);
        }
      }
      navigation.goBack();
    }, 'Could not save your event');
  };

  return (
    <FormScreenScaffold
      editing={!!event}
      noun="Event"
      submitLabel="Create Event"
      onSubmit={save}
      saving={saving}
    >
      <FormInput value={name} placeholder="Event name" onChangeText={setName} maxLength={200} />
      <DescriptionField value={description} onChangeText={setDescription} />

      <LifeEventField selectedId={eventType} onSelect={setEventType} />

      <ImageUploadField label="Event cover" upload={photo} />

      <View style={styles.privacyRow}>
        <Text style={styles.privacyLabel}>Public event</Text>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: Colors.lightGrey, true: Colors.primary }}
          thumbColor={Colors.white}
          ios_backgroundColor={Colors.lightGrey}
        />
      </View>

      <FormInput
        value={location}
        placeholder="Location"
        onChangeText={setLocation}
        maxLength={500}
      />

      <FieldLabel>Event date</FieldLabel>
      <FormInput
        value={eventDate}
        placeholder="YYYY-MM-DD"
        onChangeText={setEventDate}
        autoCapitalize="none"
        maxLength={64}
      />

      {/* Linking a wishlist you own is a create-only step this step; editing
          the linked wishlists comes with the invitee/guest surfaces. */}
      {!event && (wishlists?.length ?? 0) > 0 && (
        <>
          <FieldLabel>Link a wishlist (optional)</FieldLabel>
          <SelectableList>
            {wishlists?.map((wishlist) => (
              <SelectableRow
                key={wishlist.id}
                label={wishlist.name}
                selected={wishlistId === wishlist.id}
                onPress={() =>
                  setWishlistId(wishlistId === wishlist.id ? undefined : wishlist.id)
                }
              />
            ))}
          </SelectableList>
        </>
      )}
    </FormScreenScaffold>
  );
}

const styles = StyleSheet.create({
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  privacyLabel: {
    ...Typography.body,
  },
});
