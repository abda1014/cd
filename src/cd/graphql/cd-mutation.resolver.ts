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
// eslint-disable-next-line max-classes-per-file
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { type Cd } from '../entity/cd.entity.js';
import { CdDTO } from '../rest/cdDTO.entity.js';
import { CdWriteService } from '../service/cd-write.service.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { JwtAuthGraphQlGuard } from '../../security/auth/jwt/jwt-auth-graphql.guard.js';
import { type Lied } from '../entity/lied.entity.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { RolesAllowed } from '../../security/auth/roles/roles-allowed.decorator.js';
import { RolesGraphQlGuard } from '../../security/auth/roles/roles-graphql.guard.js';
import { type Titel } from '../entity/titel.entity.js';
import { getLogger } from '../../logger/logger.js';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export interface CreatePayload {
    readonly id: number;
}

export interface UpdatePayload {
    readonly version: number;
}

export class CdUpdateDTO extends CdDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver()
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(JwtAuthGraphQlGuard, RolesGraphQlGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class CdMutationResolver {
    readonly #service: CdWriteService;

    readonly #logger = getLogger(CdMutationResolver.name);

    constructor(service: CdWriteService) {
        this.#service = service;
    }

    @Mutation()
    @RolesAllowed('admin', 'fachabteilung')
    async create(@Args('input') cdDTO: CdDTO) {
        this.#logger.debug('create: cdDTO=%o', cdDTO);

        const cd = this.#cdDtoToCd(cdDTO);
        const id = await this.#service.create(cd);
        // TODO BadUserInputError
        this.#logger.debug('createCd: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @RolesAllowed('admin', 'fachabteilung')
    async update(@Args('input') cdDTO: CdUpdateDTO) {
        this.#logger.debug('update: cd=%o', cdDTO);

        const cd = this.#cdUpdateDtoToCd(cdDTO);
        const versionStr = `"${cdDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(cdDTO.id, 10),
            cd,
            version: versionStr,
        });
        // TODO BadUserInputError
        this.#logger.debug('updateCd: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    #cdDtoToCd(cdDTO: CdDTO): Cd {
        const titelDTO = cdDTO.titel;
        const titel: Titel = {
            id: undefined,
            titel: titelDTO.titel,
            untertitel: titelDTO.untertitel,
            cd: undefined,
        };
        const lieder = cdDTO.lieder?.map((liedDTO) => {
            const lied: Lied = {
                id: undefined,
                liedTitel: liedDTO.liedTitel,
                laenge: liedDTO.laenge,
                cd: undefined,
            };
            return lied;
        });
        const cd: Cd = {
            id: undefined,
            version: undefined,
            isrc: cdDTO.isrc,
            bewertung: cdDTO.bewertung,
            genre: cdDTO.genre,
            preis: cdDTO.preis,
            skonto: cdDTO.skonto,
            verfuegbar: cdDTO.verfuegbar,
            erscheinungsdatum: cdDTO.erscheinungsdatum,
            interpret: cdDTO.interpret,
            titel,
            lieder,
            erzeugt: undefined,
            aktualisiert: undefined,
        };

        // Rueckwaertsverweis
        cd.titel!.cd = cd;
        return cd;
    }

    #cdUpdateDtoToCd(cdDTO: CdUpdateDTO): Cd {
        return {
            id: undefined,
            version: undefined,
            isrc: cdDTO.isrc,
            bewertung: cdDTO.bewertung,
            genre: cdDTO.genre,
            preis: cdDTO.preis,
            skonto: cdDTO.skonto,
            verfuegbar: cdDTO.verfuegbar,
            erscheinungsdatum: cdDTO.erscheinungsdatum,
            interpret: cdDTO.interpret,
            titel: undefined,
            lieder: undefined,
            erzeugt: undefined,
            aktualisiert: undefined,
        };
    }

    // #errorMsgCreateCd(err: CreateError) {
    //     switch (err.type) {
    //         case 'IsrcExists': {
    //             return `Die ISRC ${err.isrc} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdateCd(err: UpdateError) {
    //     switch (err.type) {
    //         case 'CdNotExists': {
    //             return `Es gibt kein Cd mit der ID ${err.id}`;
    //         }
    //         case 'VersionInvalid': {
    //             return `"${err.version}" ist keine gueltige Versionsnummer`;
    //         }
    //         case 'VersionOutdated': {
    //             return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }
}
