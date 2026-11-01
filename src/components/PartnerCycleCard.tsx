import { phaseCopy, sharedCycleOn, type SharedCycle } from '../lib/cycle';
import { shortDate } from '../lib/dates';
import { useToday } from '../lib/hooks';
import { useTheme } from '../theme';
import { Body, Card, Eyebrow, Heading } from './ui';

/** What your partner shares of their cycle: the day, the phase and when the next period is due. */
export function PartnerCycleCard({ name, cycle: c }: { name: string; cycle: SharedCycle }) {
  const { colors } = useTheme();
  const today = useToday();
  const { cycleDay, phase, daysUntilNext: daysUntil } = sharedCycleOn(c, today);
  return (
    <Card tone="plum">
      <Eyebrow color={colors.plum}>{name}'s cycle</Eyebrow>
      <Heading style={{ fontSize: 19 }}>
        Day {cycleDay} · {phaseCopy[phase].title}
      </Heading>
      <Body style={{ fontSize: 14 }}>
        {daysUntil > 0
          ? `Period expected in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${shortDate(c.nextPeriod)}${
              c.nextLatest && c.nextLatest !== c.nextPeriod ? `, or as late as ${shortDate(c.nextLatest)}` : ''
            }).`
          : daysUntil === 0
            ? 'Period expected today.'
            : `Period was expected ${shortDate(c.nextPeriod)}.`}{' '}
        {phaseCopy[phase].body}
      </Body>
    </Card>
  );
}
