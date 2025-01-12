import { TestBed, inject, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TokenPollingService } from './token-polling.service';
import { RaidenService } from './raiden.service';
import { TestProviders } from '../../testing/test-providers';
import { UserToken } from '../models/usertoken';
import { of, BehaviorSubject } from 'rxjs';
import { createToken, createChannel } from '../../testing/test-data';
import BigNumber from 'bignumber.js';
import { ChannelPollingService } from './channel-polling.service';
import { stub } from '../../testing/stub';
import { Channel } from '../models/channel';
import { PaymentHistoryPollingService } from './payment-history-polling.service';
import { skip } from 'rxjs/operators';

describe('TokenPollingService', () => {
    let raidenService: RaidenService;
    let channelsSubject: BehaviorSubject<Channel[]>;

    const token = createToken();
    const updatedToken = Object.assign({}, token, {
        balance: new BigNumber(50),
    });
    const notOwnedToken = createToken({ balanc: new BigNumber(0) });

    const connectedTokens = [
        createToken({
            connected: {
                channels: 1,
                sum_deposits: new BigNumber(0),
            },
        }),
        createToken({
            connected: {
                channels: 2,
                sum_deposits: new BigNumber(0),
            },
        }),
    ];
    const channels = [
        createChannel({
            userToken: connectedTokens[0],
            balance: new BigNumber(50),
        }),
        createChannel({
            userToken: connectedTokens[1],
            balance: new BigNumber(15),
        }),
        createChannel({
            userToken: connectedTokens[1],
            balance: new BigNumber(5),
        }),
    ];

    beforeEach(() => {
        const channelPollingMock = stub<ChannelPollingService>();
        channelsSubject = new BehaviorSubject<Channel[]>(channels);
        // @ts-ignore
        channelPollingMock.channels$ = channelsSubject.asObservable();

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                TokenPollingService,
                ChannelPollingService,
                RaidenService,
                TestProviders.MockRaidenConfigProvider(),
                TestProviders.AddressBookStubProvider(),
                PaymentHistoryPollingService,
                {
                    provide: ChannelPollingService,
                    useValue: channelPollingMock,
                },
            ],
        });
    });

    beforeEach(() => {
        raidenService = TestBed.inject(RaidenService);
    });

    it('should be created', inject(
        [TokenPollingService],
        (service: TokenPollingService) => {
            expect(service).toBeTruthy();
        }
    ));

    it('should refresh the tokens every polling interval', inject(
        [TokenPollingService],
        fakeAsync((service: TokenPollingService) => {
            const tokenSpy = spyOn(raidenService, 'getTokens').and.returnValue(
                of([token])
            );
            let emissions = 0;
            const subscription = service.tokens$.subscribe(
                (tokens: UserToken[]) => {
                    if (emissions === 0) {
                        expect(tokens).toEqual([]);
                    } else {
                        expect(tokens).toEqual([token]);
                    }
                    emissions++;
                }
            );
            expect(tokenSpy).toHaveBeenCalledTimes(1);
            expect(tokenSpy).toHaveBeenCalledWith(true);

            const refreshSpy = spyOn(service, 'refresh').and.callThrough();
            tick(5000);
            expect(refreshSpy).toHaveBeenCalledTimes(1);
            expect(tokenSpy).toHaveBeenCalledTimes(2);
            expect(tokenSpy).toHaveBeenCalledWith(true);
            subscription.unsubscribe();
            flush();
        })
    ));

    it('should get updates for a token', inject(
        [TokenPollingService],
        fakeAsync((service: TokenPollingService) => {
            spyOn(raidenService, 'getTokens').and.returnValues(
                of([token]),
                of([token]),
                of([updatedToken])
            );
            let emittedTimes = 0;
            const subscription = service
                .getTokenUpdates(token.address)
                .pipe(skip(1))
                .subscribe((newToken) => {
                    if (emittedTimes < 2) {
                        expect(newToken).toEqual(token);
                    } else {
                        expect(newToken).toEqual(updatedToken);
                    }
                    emittedTimes++;
                });

            tick(10000);
            subscription.unsubscribe();
            flush();
        })
    ));

    it('should calculate the sum of channel balances for each token', inject(
        [TokenPollingService],
        (service: TokenPollingService) => {
            spyOn(raidenService, 'getTokens').and.returnValue(
                of(connectedTokens)
            );
            service.tokens$.pipe(skip(1)).subscribe((tokens: UserToken[]) => {
                expect(tokens[0].sumChannelBalances).toEqual(new BigNumber(50));
                expect(tokens[1].sumChannelBalances).toEqual(new BigNumber(20));
            });
        }
    ));

    it('should sort tokens first by usage, then sum of channel balances, then owned and last not owned', inject(
        [TokenPollingService],
        (service: TokenPollingService) => {
            const usedToken = createToken();
            const paymentHistoryPollingService = TestBed.inject(
                PaymentHistoryPollingService
            );
            spyOn(paymentHistoryPollingService, 'getTokenUsage').and.callFake(
                (tokenAddress) => {
                    return {
                        [usedToken.address]: 6,
                        [connectedTokens[0].address]: 2,
                    }[tokenAddress];
                }
            );
            spyOn(raidenService, 'getTokens').and.returnValue(
                of(connectedTokens.concat([usedToken, token, notOwnedToken]))
            );

            service.tokens$.pipe(skip(1)).subscribe((tokens: UserToken[]) => {
                expect(tokens[0].address).toBe(usedToken.address);
                expect(tokens[1].address).toBe(connectedTokens[0].address);
                expect(tokens[2].address).toBe(connectedTokens[1].address);
                expect(tokens[3].address).toBe(token.address);
                expect(tokens[4].address).toBe(notOwnedToken.address);
            });
        }
    ));
});
