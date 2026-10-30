import { FlexWidget, ImageWidget, OverlapWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { relativeTime } from '../lib/dates';
import type { Moment } from '../lib/store';
import type { FontPref, Palette } from '../theme';

export const WIDGET_NAME = 'Moment';

const RADIUS = 24;

type Props = {
  /** The partner's newest moment, if they've sent one. */
  moment?: Moment;
  partnerName: string;
  colors: Palette;
  /** Text in the phone's own font, or in DM Sans (bundled with the widget) to match the app. */
  font: FontPref;
  width: number;
  height: number;
};

const hex = (c: string) => c as ColorProp;

/**
 * The home screen widget: whatever your partner last sent, filling the tile, with their
 * name and when. A video shows as a still frame. Tapping it opens that moment in the app
 * (where a video plays), or Moments while there's nothing yet.
 */
export function MomentWidget({ moment, partnerName, colors, font, width, height }: Props) {
  const uri = moment ? `purelove://moment/${moment.id}` : 'purelove://moments';
  const open = { clickAction: 'OPEN_URI', clickActionData: { uri } } as const;
  const name = partnerName || 'your partner';
  const bold = font === 'classic' ? { fontFamily: 'DMSans_700Bold' } : { fontWeight: 'bold' as const };

  if (!moment) {
    return (
      <FlexWidget
        {...open}
        accessibilityLabel={`Waiting for a moment from ${name}`}
        style={{
          height: 'match_parent',
          width: 'match_parent',
          borderRadius: RADIUS,
          backgroundColor: hex(colors.flameSoft),
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          flexGap: 8,
        }}
      >
        <TextWidget text="💌" style={{ fontSize: 30 }} allowFontScaling={false} />
        <TextWidget
          text={`Waiting for a moment from ${name}`}
          maxLines={3}
          style={{ fontSize: 13, ...bold, color: hex(colors.flameDeep), textAlign: 'center' }}
        />
      </FlexWidget>
    );
  }

  // Photos are square (and a video's still frame is cropped the same way), so draw a square big
  // enough to cover the tile and let it crop.
  const side = Math.ceil(Math.max(width, height));
  return (
    <OverlapWidget
      {...open}
      accessibilityLabel={`${name}'s latest moment`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: RADIUS,
        overflow: 'hidden',
        backgroundColor: hex(colors.surface),
      }}
    >
      <ImageWidget
        image={moment.uri as `data:image${string}`}
        imageWidth={side}
        imageHeight={side}
        resizeMode="cover"
        style={{ height: 'match_parent', width: 'match_parent' }}
      />
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingBottom: 10,
          flexGap: 6,
          backgroundGradient: { from: '#00000000', to: '#00000099', orientation: 'TOP_BOTTOM' },
        }}
      >
        {moment.caption ? (
          <FlexWidget
            style={{
              backgroundColor: '#FFFFFFEB',
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <TextWidget
              text={moment.caption}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 12, ...bold, color: '#0B0A09' }}
            />
          </FlexWidget>
        ) : null}
        <TextWidget
          text={`${name} · ${relativeTime(moment.createdAt)}`}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 11, ...bold, color: '#FFFFFF' }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
