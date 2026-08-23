import { Plus, Trash2 } from "lucide-react";
import type { Dispatch } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import type { AppAction, EditableEventRow } from "@/app/appReducer";
import { EVENT_ACTIONS } from "@/lib/constants";
import type { EventInput } from "@/lib/types";

export interface EventTableProps {
  rows: EditableEventRow[];
  dispatch: Dispatch<AppAction>;
}

/**
 * The editable event log — an editing mechanism, not the visual hero (see
 * the render order in App.tsx). It owns NO domain logic of its own: every
 * keystroke just dispatches UPDATE_FIELD, and the actual ARRIVE/COLLECT
 * rules live entirely in src/lib/. That separation is what let the domain
 * engine ship (and get fully tested) in Phase 2-6 before any of this UI
 * existed, and it's also why this component can be visually de-emphasized
 * without touching a single line of its logic — restyling it here changes
 * nothing about what Run Handover actually computes.
 *
 * Run Handover itself lives only in the header (Header.tsx) — one primary
 * action, one place to trigger it.
 *
 * Columns, per the spec: # | Event ID | Action | Parcel ID | Student |
 * Pickup Code | Shelf | Actions.
 */
export function EventTable({ rows, dispatch }: EventTableProps) {
  function updateField(key: string, field: keyof EventInput, value: string) {
    dispatch({ type: "UPDATE_FIELD", key, field, value });
  }

  return (
    <Panel
      headingId="event-table-heading"
      title="Event Log"
      subtitle="Source of truth for the next run — edit freely."
      headerRight={
        <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "ADD_ROW" })} className="font-mono text-xs uppercase">
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add Event
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="No events yet" description="Add an event to begin." testId="event-table-empty" />
      ) : (
        <div className="overflow-x-auto border border-border [&_td]:h-9 [&_td]:py-1 [&_th]:h-8 [&_[data-slot=input]]:h-7 [&_[data-slot=select-trigger]]:h-7">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 font-mono text-xs tracking-wider uppercase">#</TableHead>
                <TableHead className="font-mono text-xs tracking-wider uppercase">ID</TableHead>
                <TableHead className="font-mono text-xs tracking-wider uppercase">Action</TableHead>
                <TableHead className="font-mono text-xs tracking-wider uppercase">Parcel</TableHead>
                <TableHead className="font-mono text-xs tracking-wider uppercase">Student</TableHead>
                <TableHead className="font-mono text-xs tracking-wider uppercase">Pickup Code</TableHead>
                <TableHead className="font-mono text-xs tracking-wider uppercase">Shelf</TableHead>
                <TableHead className="w-10 text-right">
                  <span className="sr-only">Row actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.key} data-testid={`event-row-${index + 1}`}>
                  <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>

                  <TableCell>
                    <Input
                      aria-label={`Row ${index + 1} Event ID`}
                      value={row.data.id}
                      onChange={(event) => updateField(row.key, "id", event.target.value)}
                      className="min-w-24 font-mono"
                    />
                  </TableCell>

                  <TableCell>
                    {/* base-ui/react Select is a controlled component: the
                        selected value is the EventInput.action string, and
                        onValueChange writes straight back through the same
                        UPDATE_FIELD action every text field uses. Restricting
                        choices to exactly ARRIVE/COLLECT here means the UI
                        can never itself submit an invalid action — the
                        INVALID_EVENT check in validation.ts is a defense
                        for malformed/edited data, not something this Select
                        can trigger in normal use. */}
                    <Select
                      value={row.data.action}
                      onValueChange={(value) => updateField(row.key, "action", String(value))}
                    >
                      <SelectTrigger aria-label={`Row ${index + 1} Action`} className="w-28 font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_ACTIONS.map((action) => (
                          <SelectItem key={action} value={action} className="font-mono">
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Input
                      aria-label={`Row ${index + 1} Parcel ID`}
                      value={row.data.parcelId}
                      onChange={(event) => updateField(row.key, "parcelId", event.target.value)}
                      className="min-w-20 font-mono"
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      aria-label={`Row ${index + 1} Student`}
                      value={row.data.student}
                      onChange={(event) => updateField(row.key, "student", event.target.value)}
                      placeholder={row.data.action === "COLLECT" ? "–" : undefined}
                      className="min-w-24"
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      aria-label={`Row ${index + 1} Pickup Code`}
                      value={row.data.pickupCode}
                      onChange={(event) => updateField(row.key, "pickupCode", event.target.value.toUpperCase())}
                      className="min-w-20 font-mono uppercase"
                      maxLength={4}
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      aria-label={`Row ${index + 1} Shelf`}
                      value={row.data.shelf}
                      onChange={(event) => updateField(row.key, "shelf", event.target.value)}
                      placeholder={row.data.action === "COLLECT" ? "–" : undefined}
                      className="min-w-16 font-mono"
                    />
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => dispatch({ type: "DELETE_ROW", key: row.key })}
                      aria-label={`Delete row ${index + 1}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
