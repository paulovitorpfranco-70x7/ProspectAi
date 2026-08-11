import { Component, OnInit, inject } from '@angular/core';
import type { OutreachQueueItem } from '@application/outreach/outreach-queue.service';
import { STAGE_LABELS } from '@domain/outreach/types';
import { BadgeComponent } from '@presentation/shared/components/badge/badge.component';
import { ButtonComponent } from '@presentation/shared/components/button/button.component';
import { InputComponent } from '@presentation/shared/components/input/input.component';
import { SpinnerComponent } from '@presentation/shared/components/spinner/spinner.component';
import { FilaStore } from '../store/fila.store';

@Component({
  selector: 'app-fila-page',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, InputComponent, SpinnerComponent],
  providers: [FilaStore],
  templateUrl: './fila.page.html',
  styleUrl: './fila.page.scss',
})
export class FilaPage implements OnInit {
  protected readonly store = inject(FilaStore);
  protected readonly stageLabels = STAGE_LABELS;

  ngOnInit(): void {
    void this.store.loadOutreachQueue();
  }

  protected instagramHandle(item: OutreachQueueItem): string | null {
    const handle = item.lead.instagramHandle?.trim().replace(/^@+/, '') ?? '';

    return handle.length > 0 ? handle : null;
  }

  protected instagramUrl(handle: string): string {
    return `https://instagram.com/${encodeURIComponent(handle)}`;
  }

  protected async copyAndOpenWhatsapp(item: OutreachQueueItem): Promise<void> {
    if (item.whatsappUrl === null) {
      return;
    }

    const copyOperation = navigator.clipboard.writeText(item.mensagemRenderizada);
    window.open(item.whatsappUrl, '_blank', 'noopener,noreferrer');
    this.store.markOutreachAwaitingConfirmation(item);
    await copyOperation;
  }

  protected async undoOutreach(item: OutreachQueueItem): Promise<void> {
    const confirmed = window.confirm(
      `Desfazer o envio para ${item.lead.businessName.getValue()}? O lead voltará para a fila.`,
    );

    if (confirmed) {
      await this.store.undoOutreach(item);
    }
  }
}
