import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import {
    AddEditContactDialogComponent,
    AddEditContactDialogPayload,
} from './add-edit-contact-dialog.component';
import { AddressInputComponent } from '../address-input/address-input.component';
import { RaidenDialogComponent } from '../raiden-dialog/raiden-dialog.component';
import { TestProviders } from '../../../testing/test-providers';
import { MaterialComponentsModule } from '../../modules/material-components/material-components.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { createAddress } from '../../../testing/test-data';
import { mockInput, clickElement } from '../../../testing/interaction-helper';
import { By } from '@angular/platform-browser';
import { RaidenIconsModule } from '../../modules/raiden-icons/raiden-icons.module';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('AddEditContactDialogComponent', () => {
    let component: AddEditContactDialogComponent;
    let fixture: ComponentFixture<AddEditContactDialogComponent>;

    const addressInput = createAddress();
    const labelInput = 'Test account';

    function mockAllInputs() {
        mockInput(
            fixture.debugElement.query(By.directive(AddressInputComponent)),
            'input',
            addressInput
        );

        mockInput(
            fixture.debugElement,
            'input[formControlName="label"]',
            labelInput
        );
        fixture.detectChanges();
    }

    beforeEach(
        waitForAsync(() => {
            const payload: AddEditContactDialogPayload = {
                address: '',
                label: '',
                edit: false,
            };

            TestBed.configureTestingModule({
                declarations: [
                    AddEditContactDialogComponent,
                    AddressInputComponent,
                    RaidenDialogComponent,
                ],
                providers: [
                    TestProviders.MockMatDialogData(payload),
                    TestProviders.MockMatDialogRef({ close: () => {} }),
                    TestProviders.MockRaidenConfigProvider(),
                    TestProviders.AddressBookStubProvider(),
                ],
                imports: [
                    MaterialComponentsModule,
                    NoopAnimationsModule,
                    ReactiveFormsModule,
                    HttpClientTestingModule,
                    RaidenIconsModule,
                ],
            }).compileComponents();
        })
    );

    describe('as add dialog', () => {
        beforeEach(() => {
            fixture = TestBed.createComponent(AddEditContactDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should close the dialog with the result when accept button is clicked', () => {
            mockAllInputs();
            // @ts-ignore
            const closeSpy = spyOn(component.dialogRef, 'close');
            clickElement(fixture.debugElement, '#accept');
            fixture.detectChanges();

            expect(closeSpy).toHaveBeenCalledTimes(1);
            expect(closeSpy).toHaveBeenCalledWith({
                address: addressInput,
                label: labelInput,
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
    });

    describe('as edit dialog', () => {
        const payloadAddress = createAddress();

        beforeEach(() => {
            const payload: AddEditContactDialogPayload = {
                address: payloadAddress,
                label: 'Tester',
                edit: true,
            };
            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: payload });
            fixture = TestBed.createComponent(AddEditContactDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('should close the dialog with the payload address when accept button is clicked', () => {
            mockInput(
                fixture.debugElement,
                'input[formControlName="label"]',
                labelInput
            );
            fixture.detectChanges();
            // @ts-ignore
            const closeSpy = spyOn(component.dialogRef, 'close');
            clickElement(fixture.debugElement, '#accept');
            fixture.detectChanges();

            expect(closeSpy).toHaveBeenCalledTimes(1);
            expect(closeSpy).toHaveBeenCalledWith({
                address: payloadAddress,
                label: labelInput,
            });
        });
    });
});
