import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Observable, EMPTY } from 'rxjs';
import { map, share, mergeMap } from 'rxjs/operators';
import { UserToken } from '../../models/usertoken';
import { RaidenService } from '../../services/raiden.service';
import { TokenPollingService } from '../../services/token-polling.service';
import { MatDialog } from '@angular/material/dialog';
import { RegisterDialogComponent } from '../register-dialog/register-dialog.component';
import { SelectedTokenService } from '../../services/selected-token.service';

@Component({
    selector: 'app-token-network-selector',
    templateUrl: './token-network-selector.component.html',
    styleUrls: ['./token-network-selector.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TokenNetworkSelectorComponent),
            multi: true,
        },
    ],
})
export class TokenNetworkSelectorComponent implements ControlValueAccessor {
    @Input() onlyConnectedTokens = false;
    @Input() showOnChainBalance = false;
    @Input() showChannelBalance = false;
    @Input() showRegisterButton = false;
    @Input() setSelectedToken = false;
    @Input() placeholder = 'Token Network';
    @Input() selectorClass = '';
    @Input() panelClass = '';

    value: UserToken;
    tokens$: Observable<UserToken[]>;

    private propagateTouched = () => {};
    private propagateChange = (token: UserToken) => {};

    constructor(
        private tokenPollingService: TokenPollingService,
        private raidenService: RaidenService,
        private dialog: MatDialog,
        private selectedTokenService: SelectedTokenService
    ) {
        this.tokens$ = this.tokenPollingService.tokens$.pipe(
            map((value) =>
                this.onlyConnectedTokens
                    ? value.filter((token) => !!token.connected)
                    : value
            ),
            share()
        );
    }

    registerOnChange(fn: any) {
        this.propagateChange = fn;
    }

    registerOnTouched(fn: any) {
        this.propagateTouched = fn;
    }

    writeValue(obj: any) {
        if (!obj || !obj.address) {
            return;
        }
        this.value = obj;
        this.onChange(obj);
    }

    onChange(value: UserToken) {
        this.propagateChange(value);
        if (this.setSelectedToken) {
            this.selectedTokenService.setToken(value);
        }
    }

    onTouched() {
        this.propagateTouched();
    }

    trackByFn(token: UserToken): string {
        return token.address;
    }

    register() {
        const dialog = this.dialog.open(RegisterDialogComponent, {});

        dialog
            .afterClosed()
            .pipe(
                mergeMap((tokenAddress: string) => {
                    if (!tokenAddress) {
                        return EMPTY;
                    }

                    return this.raidenService.registerToken(tokenAddress);
                })
            )
            .subscribe(() => {
                this.tokenPollingService.refresh();
            });
    }
}
