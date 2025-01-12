import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialComponentsModule } from '../../modules/material-components/material-components.module';
import { AddressInputComponent } from '../address-input/address-input.component';
import { TokenInputComponent } from '../token-input/token-input.component';
import { TokenNetworkSelectorComponent } from '../token-network-selector/token-network-selector.component';
import {
    OpenDialogComponent,
    OpenDialogPayload,
} from './open-dialog.component';
import { TestProviders } from '../../../testing/test-providers';
import {
    mockInput,
    mockOpenMatSelect,
    mockMatSelectFirst,
    clickElement,
} from '../../../testing/interaction-helper';
import { By } from '@angular/platform-browser';
import BigNumber from 'bignumber.js';
import { RaidenService } from '../../services/raiden.service';
import { createToken, createAddress } from '../../../testing/test-data';
import { TokenPollingService } from '../../services/token-polling.service';
import { stub } from '../../../testing/stub';
import { RaidenDialogComponent } from '../raiden-dialog/raiden-dialog.component';
import { of } from 'rxjs';
import { DecimalPipe } from '../../pipes/decimal.pipe';
import { DisplayDecimalsPipe } from '../../pipes/display-decimals.pipe';
import { RaidenIconsModule } from '../../modules/raiden-icons/raiden-icons.module';
import { BalanceWithSymbolComponent } from '../balance-with-symbol/balance-with-symbol.component';
import { ClipboardModule } from 'ngx-clipboard';

describe('OpenDialogComponent', () => {
    let component: OpenDialogComponent;
    let fixture: ComponentFixture<OpenDialogComponent>;

    const token = createToken({
        decimals: 0,
        balance: new BigNumber(1000),
    });
    const addressInput = createAddress();
    const amountInput = '500';
    const defaultSettleTimeout = 500;
    const revealTimeout = 20;

    function mockAllInputs() {
        mockInput(
            fixture.debugElement.query(By.directive(AddressInputComponent)),
            'input',
            addressInput
        );
        mockInput(
            fixture.debugElement.query(By.directive(TokenInputComponent)),
            'input',
            amountInput
        );

        const networkSelectorElement = fixture.debugElement.query(
            By.directive(TokenNetworkSelectorComponent)
        );
        mockOpenMatSelect(networkSelectorElement);
        fixture.detectChanges();
        mockMatSelectFirst(fixture.debugElement);
        fixture.detectChanges();
    }

    beforeEach(
        waitForAsync(() => {
            const payload: OpenDialogPayload = {
                token: token,
                defaultSettleTimeout: defaultSettleTimeout,
                revealTimeout: revealTimeout,
            };

            const tokenPollingMock = stub<TokenPollingService>();
            // @ts-ignore
            tokenPollingMock.tokens$ = of([token]);
            tokenPollingMock.getTokenUpdates = () => of(token);

            TestBed.configureTestingModule({
                declarations: [
                    OpenDialogComponent,
                    TokenInputComponent,
                    AddressInputComponent,
                    TokenNetworkSelectorComponent,
                    RaidenDialogComponent,
                    DecimalPipe,
                    DisplayDecimalsPipe,
                    BalanceWithSymbolComponent,
                ],
                providers: [
                    TestProviders.MockMatDialogData(payload),
                    TestProviders.MockMatDialogRef({ close: () => {} }),
                    TestProviders.MockRaidenConfigProvider(),
                    TestProviders.AddressBookStubProvider(),
                    {
                        provide: TokenPollingService,
                        useValue: tokenPollingMock,
                    },
                ],
                imports: [
                    MaterialComponentsModule,
                    NoopAnimationsModule,
                    ReactiveFormsModule,
                    HttpClientTestingModule,
                    RaidenIconsModule,
                    ClipboardModule,
                ],
            }).compileComponents();
        })
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(OpenDialogComponent);
        component = fixture.componentInstance;

        spyOn(TestBed.inject(RaidenService), 'getUserToken').and.returnValue(
            token
        );

        fixture.detectChanges(false);
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
        fixture.destroy();
    });

    it('should close the dialog with the result when accept button is clicked', () => {
        mockAllInputs();
        // @ts-ignore
        const closeSpy = spyOn(component.dialogRef, 'close');
        clickElement(fixture.debugElement, '#accept');
        fixture.detectChanges();

        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(closeSpy).toHaveBeenCalledWith({
            token: token,
            partnerAddress: addressInput,
            settleTimeout: defaultSettleTimeout,
            balance: new BigNumber(amountInput),
        });
    });

    it('should close the dialog with no result when cancel button is clicked', () => {
        mockAllInputs();
        // @ts-ignore
        const closeSpy = spyOn(component.dialogRef, 'close');
        clickElement(fixture.debugElement, '#cancel');
        fixture.detectChanges();

        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(closeSpy).toHaveBeenCalledWith();
    });

    it('should set the maximum token amount to the balance', () => {
        const tokenInputComponent: TokenInputComponent = fixture.debugElement.query(
            By.directive(TokenInputComponent)
        ).componentInstance;
        expect(tokenInputComponent.maxAmount.isEqualTo(token.balance)).toBe(
            true
        );
    });

    describe('settle timeout input', () => {
        it('should not show an error without a user input', () => {
            const errorElement = fixture.debugElement.query(
                By.css('#timeout-error')
            );
            expect(errorElement).toBeFalsy();
        });

        it('should show an error if the input is invalid', () => {
            mockInput(
                fixture.debugElement,
                'input[formControlName="settle_timeout"]',
                '0x'
            );
            fixture.detectChanges();

            const errorElement = fixture.debugElement.query(
                By.css('#timeout-error')
            );
            const errorMessage = errorElement.nativeElement.innerText.trim();
            expect(errorMessage).toBe(
                'The settle timeout is not a valid number'
            );
            expect(
                component.form.get('settle_timeout').errors['invalidAmount']
            ).toBe(true);
        });

        it('should show an error if the input is below the minimum', () => {
            mockInput(
                fixture.debugElement,
                'input[formControlName="settle_timeout"]',
                '1'
            );
            fixture.detectChanges();

            const errorElement = fixture.debugElement.query(
                By.css('#timeout-error')
            );
            const errorMessage = errorElement.nativeElement.innerText.trim();
            expect(errorMessage).toBe(
                `Reveal timeout is ${revealTimeout}, settle timeout should be at least ${
                    revealTimeout * 2
                }`
            );
            expect(
                component.form.get('settle_timeout').errors['min']
            ).toBeTruthy();
        });
    });
});
