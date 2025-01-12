import { Component, OnInit, Input } from '@angular/core';
import { Channel } from '../../models/channel';
import { AddressBookService } from '../../services/address-book.service';
import { DepositMode } from '../../models/deposit-mode.enum';
import {
    ConfirmationDialogPayload,
    ConfirmationDialogComponent,
} from '../confirmation-dialog/confirmation-dialog.component';
import { mergeMap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import {
    DepositWithdrawDialogPayload,
    DepositWithdrawDialogComponent,
    DepositWithdrawDialogResult,
} from '../deposit-withdraw-dialog/deposit-withdraw-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ChannelPollingService } from '../../services/channel-polling.service';
import { TokenPollingService } from '../../services/token-polling.service';
import { RaidenService } from '../../services/raiden.service';

@Component({
    selector: 'app-channel',
    templateUrl: './channel.component.html',
    styleUrls: ['./channel.component.scss'],
})
export class ChannelComponent implements OnInit {
    @Input() channel: Channel;

    constructor(
        private addressBookService: AddressBookService,
        private dialog: MatDialog,
        private channelPollingService: ChannelPollingService,
        private tokenPollingService: TokenPollingService,
        private raidenService: RaidenService
    ) {}

    ngOnInit() {}

    deposit() {
        this.openDeposit(DepositMode.DEPOSIT);
    }

    withdraw() {
        this.openDeposit(DepositMode.WITHDRAW);
    }

    close() {
        const partner = this.addressBookService.get()[
            this.channel.partner_address
        ];

        const payload: ConfirmationDialogPayload = {
            title: 'Close Channel',
            message: `Are you sure you want to close the ${
                this.channel.userToken.symbol
            } channel with ${partner ? partner + ' ' : ''}${
                this.channel.partner_address
            } in ${this.channel.userToken.name} network?`,
        };

        const dialog = this.dialog.open(ConfirmationDialogComponent, {
            data: payload,
        });

        dialog
            .afterClosed()
            .pipe(
                mergeMap((result) => {
                    if (!result) {
                        return EMPTY;
                    }

                    return this.raidenService.closeChannel(
                        this.channel.token_address,
                        this.channel.partner_address
                    );
                })
            )
            .subscribe(() => {
                this.channelPollingService.refresh();
                this.tokenPollingService.refresh();
            });
    }

    private openDeposit(depositMode: DepositMode) {
        const payload: DepositWithdrawDialogPayload = {
            channel: this.channel,
            depositMode: depositMode,
        };

        const dialog = this.dialog.open(DepositWithdrawDialogComponent, {
            data: payload,
        });

        dialog
            .afterClosed()
            .pipe(
                mergeMap((deposit?: DepositWithdrawDialogResult) => {
                    if (!deposit) {
                        return EMPTY;
                    }

                    return this.raidenService.modifyDeposit(
                        this.channel.token_address,
                        this.channel.partner_address,
                        deposit.tokenAmount,
                        depositMode
                    );
                })
            )
            .subscribe(() => {
                this.channelPollingService.refresh();
                this.tokenPollingService.refresh();
            });
    }
}
