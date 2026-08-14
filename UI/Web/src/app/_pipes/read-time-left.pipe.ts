import { Pipe, PipeTransform, inject } from '@angular/core';
import {TranslocoService} from "@jsverse/transloco";
import {HourEstimateRange} from "../_models/series-detail/hour-estimate-range";

@Pipe({
  name: 'readTimeLeft',
  standalone: true
})
export class ReadTimeLeftPipe implements PipeTransform {
  private readonly translocoService = inject(TranslocoService);


  transform(readingTimeLeft: HourEstimateRange, includeLeftLabel = false): string {
    const hoursLabel = readingTimeLeft.avgHours > 1
      ? this.translocoService.translate(`read-time-pipe.hours${includeLeftLabel ? '-left' : ''}`)
      : this.translocoService.translate(`read-time-pipe.hour${includeLeftLabel ? '-left' : ''}`);

    const formattedHours = readingTimeLeft.avgHours.toFixed(1);

    return `~${formattedHours} ${hoursLabel}`;
  }
}
