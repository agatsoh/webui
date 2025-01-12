import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialComponentsModule } from '../../modules/material-components/material-components.module';
import {
    ErrorStateMatcher,
    ShowOnDirtyErrorStateMatcher,
} from '@angular/material/core';
import { TokenInputComponent } from './token-input.component';
import { mockInput, clickElement } from '../../../testing/interaction-helper';
import { createToken } from '../../../testing/test-data';
import BigNumber from 'bignumber.js';
import { DecimalPipe } from '../../pipes/decimal.pipe';
import { DisplayDecimalsPipe } from '../../pipes/display-decimals.pipe';
import { BalanceWithSymbolComponent } from '../balance-with-symbol/balance-with-symbol.component';
import { ClipboardModule } from 'ngx-clipboard';
import { amountToDecimal } from 'app/utils/amount.converter';

describe('TokenInputComponent', () => {
    let component: TokenInputComponent;
    let fixture: ComponentFixture<TokenInputComponent>;

    let input: HTMLInputElement;
    const token = createToken();

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    TokenInputComponent,
                    DecimalPipe,
                    DisplayDecimalsPipe,
                    BalanceWithSymbolComponent,
                ],
                providers: [
                    {
                        provide: ErrorStateMatcher,
                        useClass: ShowOnDirtyErrorStateMatcher,
                    },
                ],
                imports: [
                    MaterialComponentsModule,
                    NoopAnimationsModule,
                    ClipboardModule,
                ],
            }).compileComponents();
        })
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(TokenInputComponent);
        component = fixture.componentInstance;
        component.placeholder = 'Amount';
        component.selectedToken = token;
        fixture.detectChanges();

        const inputDebugElement = fixture.debugElement.query(By.css('input'));
        input = inputDebugElement.nativeElement as HTMLInputElement;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should be empty by default', () => {
        expect(input.value).toBe('');
        expect(component.amount.isNaN()).toBe(true);
        expect(component.errors).toBeTruthy();
    });

    it('should convert the input to a BigNumber', () => {
        mockInput(fixture.debugElement, 'input', '0.000000000000000010');
        fixture.detectChanges();

        expect(input.value).toBe('0.000000000000000010');
        expect(component.amount.isEqualTo(10)).toBe(true);
        expect(component.errors).toBeFalsy();
    });

    it('should not show an error without a user input', () => {
        const errorsElement = fixture.debugElement.query(By.css('#errors'));
        expect(errorsElement).toBeFalsy();
    });

    it('should show errors while the user types', () => {
        mockInput(fixture.debugElement, 'input', '0.0000000000000000101');
        fixture.detectChanges();
        expect(component.errors['tooManyDecimals']).toBe(true);
    });

    it('should show error when input is empty', () => {
        mockInput(fixture.debugElement, 'input', '');
        fixture.detectChanges();

        expect(component.amount.isNaN()).toBe(true);
        expect(component.errors['notANumber']).toBe(true);
    });

    it('should show error when input is not a number', () => {
        mockInput(fixture.debugElement, 'input', '1Hello');
        fixture.detectChanges();

        expect(component.amount.isNaN()).toBe(true);
        expect(component.errors['notANumber']).toBe(true);
    });

    it('should show error when input value is negative', () => {
        mockInput(fixture.debugElement, 'input', '-30');
        fixture.detectChanges();
        expect(component.errors['negativeAmount']).toBe(true);
    });

    it('should show error when input value is 0', () => {
        mockInput(fixture.debugElement, 'input', '0');
        fixture.detectChanges();

        expect(component.amount.isEqualTo(0)).toBe(true);
        expect(component.errors['zeroAmount']).toBe(true);
    });

    it('should show no error when input value is 0 and zero is allowed', () => {
        component.allowZero = true;
        mockInput(fixture.debugElement, 'input', '0');
        fixture.detectChanges();

        expect(component.amount.isEqualTo(0)).toBe(true);
        expect(component.errors).toBeFalsy();
    });

    it('should use 0 as decimals when no token selected', () => {
        component.selectedToken = undefined;
        mockInput(fixture.debugElement, 'input', '0.000000000000000010');
        fixture.detectChanges();
        expect(component.decimals).toBe(0);
        expect(component.errors['tooManyDecimals']).toBe(true);
    });

    it('should be able to set a string value programmatically', () => {
        component.writeValue('0.00003');
        fixture.detectChanges();

        expect(input.value).toBe('0.00003');
        expect(component.amount.isEqualTo(30000000000000)).toBe(true);
        expect(component.errors).toBeFalsy();
    });

    it('should be able to set a BigNumber value programmatically', () => {
        const value = new BigNumber(500000000000000);
        component.writeValue(value);
        fixture.detectChanges();

        expect(input.value).toBe(
            amountToDecimal(value, token.decimals).toFixed()
        );
        expect(component.amount.isEqualTo(value)).toBe(true);
        expect(component.errors).toBeFalsy();
    });

    it('should not to set a wrongly typed value programmatically', () => {
        component.writeValue(100);
        fixture.detectChanges();

        expect(input.value).toBe('');
        expect(component.amount.isNaN()).toBe(true);
    });

    it('should show the available token amount', () => {
        component.maxAmount = new BigNumber(7000000000000000);
        fixture.detectChanges();
        const maxAmountText = fixture.debugElement.query(By.css('#max-amount'));
        expect(maxAmountText.nativeElement.innerText.trim()).toBe(
            `0.007 ${token.symbol}`
        );
    });

    it('should show error when input value is greater than max amount', () => {
        component.maxAmount = new BigNumber(7000000000000000);
        mockInput(fixture.debugElement, 'input', '0.008');
        fixture.detectChanges();

        expect(component.errors['insufficientFunds']).toBe(true);
    });

    it('should set the input value to the max amount', () => {
        component.maxAmount = new BigNumber(7000000000000000);
        fixture.detectChanges();
        clickElement(fixture.debugElement, '.info-box__max-button');
        fixture.detectChanges();

        expect(input.value).toBe('0.007');
        expect(component.amount.isEqualTo(7000000000000000)).toBe(true);
        expect(component.errors).toBeFalsy();
    });

    it('should show a warning if amount is lower than token transfer threshold', () => {
        component.selectedToken = createToken({
            transferThreshold: new BigNumber(100),
        });
        component.showTransferLimit = true;
        mockInput(fixture.debugElement, 'input', '0.00000000000000001');
        fixture.detectChanges();
        const hint = fixture.debugElement.query(By.css('#threshold-hint'));
        expect(hint).toBeTruthy();
    });

    it('should not show a warning if amount is greater than token transfer threshold', () => {
        component.selectedToken = createToken({
            transferThreshold: new BigNumber(100),
        });
        component.showTransferLimit = true;
        mockInput(fixture.debugElement, 'input', '0.0000000000001');
        fixture.detectChanges();
        const hint = fixture.debugElement.query(By.css('#threshold-hint'));
        expect(hint).toBeFalsy();
    });

    it('should not show a low transfer amount warning if there is no threshold', () => {
        component.showTransferLimit = true;
        mockInput(fixture.debugElement, 'input', '0.00000000000000001');
        fixture.detectChanges();
        const hint = fixture.debugElement.query(By.css('#threshold-hint'));
        expect(hint).toBeFalsy();
    });

    it('should not show a low transfer amount warning if no token selected', () => {
        component.selectedToken = undefined;
        component.showTransferLimit = true;
        mockInput(fixture.debugElement, 'input', '0.00000000000000001');
        fixture.detectChanges();
        const hint = fixture.debugElement.query(By.css('#threshold-hint'));
        expect(hint).toBeFalsy();
    });
});
