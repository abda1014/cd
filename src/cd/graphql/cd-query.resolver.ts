/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Cd } from '../entity/cd.entity.js';
import { CdReadService } from '../service/cd-read.service.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { getLogger } from '../../logger/logger.js';

export interface IdInput {
    readonly id: number;
}

@Resolver((_: any) => Cd)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class CdQueryResolver {
    readonly #service: CdReadService;

    readonly #logger = getLogger(CdQueryResolver.name);

    constructor(service: CdReadService) {
        this.#service = service;
    }

    @Query('cd')
    async findById(@Args() idInput: IdInput) {
        const { id } = idInput;
        this.#logger.debug('findById: id=%d', id);

        const cd = await this.#service.findById({ id });

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: cd=%s, titel=%o',
                cd.toString(),
                cd.titel,
            );
        }
        return cd;
    }

    @Query('cds')
    async find(@Args() titel: { titel: string } | undefined) {
        const titelStr = titel?.titel;
        this.#logger.debug('find: Suchkriterium titel=%s', titelStr);
        const suchkriterium = titelStr === undefined ? {} : { titel: titelStr };

        const cds = await this.#service.find(suchkriterium);

        this.#logger.debug('find: cds=%o', cds);
        return cds;
    }

    @ResolveField('skonto')
    skonto(@Parent() cd: Cd, short: boolean | undefined) {
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('skonto: cd=%s, short=%s', cd.toString(), short);
        }
        const skonto = cd.skonto ?? 0;
        const shortStr = short === undefined || short ? '%' : 'Prozent';
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        return `${(skonto * 100).toFixed(2)} ${shortStr}`;
    }
}
